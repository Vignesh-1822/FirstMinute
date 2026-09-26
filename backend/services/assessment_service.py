"""Turns a transcript into a scored Assessment.

Builds the single batch of Jev questions for a protocol pack, calls
jev_service (live or simulated - this module doesn't care which), applies
the SPEC status rules (missing/uncertain/confident), folds in code-only
regex extraction, and produces flags/follow-ups/interpretation.
"""
from __future__ import annotations

from datetime import datetime, timezone

from config import ROUTING_POLICY
from models import Assessment, Flag, FollowUp, Interpretation, ItemResult, ItemStatus, JevCallStats
from services import extraction, jev_service, protocol_service


def _option_key(level_str: str) -> str:
    if " - " in level_str:
        return level_str.split(" - ", 1)[0].strip()
    return level_str.strip()


def _reading_instructions(protocol_id: str) -> str:
    if protocol_id == "stroke_race":
        return (
            "Score each RACE item from the paramedic's spoken report. If an item is never "
            "described, say so rather than assuming a normal finding. Note the side of any "
            "weakness and any mention of seizure, head trauma, or anticoagulant use."
        )
    return (
        "Extract each 9-line MEDEVAC item from the radio transmission. If a line is ambiguous, "
        "contradictory, or spoken with hedging, lower your confidence rather than guessing."
    )


def build_questions(pack: dict) -> dict[str, dict]:
    questions: dict[str, dict] = {}
    for item in pack["items"]:
        item_id = item["id"]
        if item["kind"] == "score":
            questions[item_id] = {
                "type": "score",
                "prompt": item.get("jev_question", item["label"]),
                "criteria": item["levels"],
            }
        else:
            key_label = {_option_key(lvl): lvl for lvl in item["levels"]}
            questions[item_id] = {
                "type": "choice",
                "prompt": item.get("jev_question", item["label"]),
                "criteria": key_label,
            }
        questions[f"mentioned_{item_id}"] = {
            "type": "noul",
            "prompt": f"Does the report describe {item['label'].lower()}, including a normal finding, even if not by that name?",
        }

    extra = pack.get("extra_questions", {})
    if "weak_side" in extra:
        spec = extra["weak_side"]
        questions["weak_side"] = {
            "type": "choice",
            "prompt": spec.get("label", "Which side is weak?"),
            "criteria": spec["criteria"],
        }

    for flag in pack.get("flag_questions", []):
        questions[flag["id"]] = {"type": "noul", "prompt": flag["question"]}

    return questions


def _status(mentioned: float, confidence: float) -> ItemStatus:
    if mentioned < ROUTING_POLICY["mentioned_missing_threshold"]:
        return "missing"
    if confidence < ROUTING_POLICY["confidence_uncertain_threshold"]:
        return "uncertain"
    return "confident"


def _stroke_interpretation(total: float) -> Interpretation:
    if total >= ROUTING_POLICY["lvo_race_threshold"]:
        return Interpretation(label="LVO suspected", severity="high")
    if total >= 3:
        return Interpretation(label="Moderate stroke severity", severity="moderate")
    return Interpretation(label="Low stroke severity", severity="low")


def _medevac_interpretation(items: list[ItemResult]) -> Interpretation:
    l3 = next((it for it in items if it.id == "l3"), None)
    if l3 is None or l3.value is None or not l3.value_label:
        return Interpretation(label="Precedence pending", severity="moderate")
    label = l3.value_label.strip()
    if label.startswith("A") or label.startswith("B"):
        severity = "high"
    elif label.startswith("C"):
        severity = "moderate"
    else:
        severity = "low"
    return Interpretation(label=f"Precedence: {label}", severity=severity)


def _build_follow_ups(pack: dict, items: list[ItemResult]) -> list[FollowUp]:
    follow_ups: list[FollowUp] = []
    items_by_id = {it.id: it for it in items}
    for item in pack["items"]:
        result = items_by_id.get(item["id"])
        if result is None or result.status == "confident":
            continue
        follow_ups.append(FollowUp(item_id=item["id"], question=item["follow_up"], reason=result.status))
    return follow_ups


async def run_assessment(protocol_id: str, transcript: str, now: datetime | None = None) -> Assessment:
    pack = protocol_service.get_pack(protocol_id)
    questions = build_questions(pack)
    state = {
        "report": transcript,
        "protocol": pack["name"],
        "instructions for reading": _reading_instructions(protocol_id),
    }
    result = await jev_service.evaluate(state, questions)

    items: list[ItemResult] = []
    for item in pack["items"]:
        item_id = item["id"]
        answer = result.answers.get(item_id, {})
        mentioned_answer = result.answers.get(f"mentioned_{item_id}", {})
        mentioned = float(mentioned_answer.get("noul", 0.1))
        confidence = float(answer.get("confidence", 0.0))
        status = _status(mentioned, confidence)

        if item["kind"] == "score":
            levels: list[str] = item["levels"]
            raw_probs = answer.get("probabilities", {}) or {}
            probabilities = {levels[int(k)]: v for k, v in raw_probs.items() if int(k) < len(levels)}
            score = float(answer.get("score", 0.0))
            rounded = max(0, min(len(levels) - 1, round(score)))
            value = None if status == "missing" else float(rounded)
            value_label = None if status == "missing" else levels[rounded]
        else:
            key_label = {_option_key(lvl): lvl for lvl in item["levels"]}
            option_keys = list(key_label.keys())
            raw_probs = answer.get("probabilities", {}) or {}
            probabilities = {key_label.get(k, k): v for k, v in raw_probs.items()}
            choice_key = answer.get("choice")
            idx = option_keys.index(choice_key) if choice_key in option_keys else None
            value = None if status == "missing" else (float(idx) if idx is not None else None)
            value_label = None if status == "missing" else key_label.get(choice_key)

        items.append(
            ItemResult(
                id=item_id,
                label=item["label"],
                value=value,
                value_label=value_label,
                probabilities=probabilities,
                confidence=confidence,
                mentioned=mentioned,
                status=status,
            )
        )

    extracted: dict[str, str | float | None] = {}
    flags: list[Flag] = []

    if protocol_id == "stroke_race":
        lkw = extraction.extract_lkw_minutes(transcript, now=now)
        glucose = extraction.extract_glucose(transcript)
        extracted["lkw_minutes"] = lkw
        extracted["glucose"] = glucose
        weak_answer = result.answers.get("weak_side", {})
        extracted["weak_side"] = weak_answer.get("choice")

        # Only surface the mimic flag when glucose is actually low; a normal value is not a finding.
        if glucose is not None and glucose < ROUTING_POLICY["hypoglycemia_glucose_threshold"]:
            active = True
            flags.append(
                Flag(
                    id="hypoglycemia_mimic",
                    label=f"Possible hypoglycemia (glucose {glucose} mg/dL) - stroke mimic",
                    probability=1.0 if active else 0.0,
                    active=active,
                    source="code",
                )
            )
        for fq in pack.get("flag_questions", []):
            ans = result.answers.get(fq["id"], {})
            prob = float(ans.get("noul", 0.0))
            flags.append(Flag(id=fq["id"], label=fq["label"], probability=prob, active=prob >= 0.5, source="jev"))

        total = sum((it.value or 0.0) for it in items)
        max_total = float(sum(len(item["levels"]) - 1 for item in pack["items"]))
        interpretation = _stroke_interpretation(total)
    else:
        extracted["grid"] = extraction.extract_grid(transcript)
        extracted["callsign"] = extraction.extract_callsign(transcript)
        extracted["frequency"] = extraction.extract_frequency(transcript)
        total = None
        max_total = None
        interpretation = _medevac_interpretation(items)

    follow_ups = _build_follow_ups(pack, items)

    return Assessment(
        items=items,
        total=total,
        max_total=max_total,
        interpretation=interpretation,
        extracted=extracted,
        flags=flags,
        follow_ups=follow_ups,
        jev=JevCallStats(
            mode=result.mode,
            model=result.model,
            latency_ms=result.latency_ms,
            questions=result.questions,
            input_tokens=result.input_tokens,
            cost_usd=result.cost_usd,
        ),
        computed_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    )
