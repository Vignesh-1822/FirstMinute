"""Jev (TypeSafe System One) client.

Live mode (TYPESAFE_API_KEY set): POST the whole batch of questions for one
assessment in a single request to the Jev API and let it score every item in
parallel.

Simulated mode (no key): a deterministic, keyword/phrase-driven heuristic
engine that returns answers in exactly the same shape Jev would, so the rest
of the app (assessment_service, the API, the frontend) cannot tell the
difference except via `mode`. Every rule here is negation-aware in the sense
that explicit negative phrases ("no facial droop") are their own, higher
priority rule rather than something inferred generically.
"""
from __future__ import annotations

import asyncio
import random
import re
import time
from dataclasses import dataclass, field
from typing import Any

import httpx

from config import settings

JEV_TIMEOUT_SECONDS = 30.0
MAX_ATTEMPTS = 4
INITIAL_BACKOFF_SECONDS = 0.5
RETRYABLE_STATUS_CODES = {429, 529}


class JevError(RuntimeError):
    """Raised when the live Jev API call ultimately fails."""


@dataclass
class JevResult:
    answers: dict[str, Any]
    mode: str
    model: str
    latency_ms: int
    input_tokens: int
    cost_usd: float
    questions: int = field(default=0)


async def evaluate(state: dict[str, Any], questions: dict[str, dict[str, Any]]) -> JevResult:
    """Score `questions` against `state` (the transcript + protocol context).

    Both modes accept/return the same shapes: for each question id, an
    answer dict shaped by its "type" (noul -> {"noul": float}, choice ->
    {"choice": str, "probabilities": {...}, "confidence": float}, score ->
    {"score": float, "legend": {...}, "probabilities": {...}, "confidence": float}).
    """
    if not questions:
        return JevResult(answers={}, mode=settings.jev_mode, model=settings.JEV_MODEL, latency_ms=0, input_tokens=0, cost_usd=0.0, questions=0)
    if settings.TYPESAFE_API_KEY:
        return await _evaluate_live(state, questions)
    return await _evaluate_simulated(state, questions)


# ---------------------------------------------------------------------------
# Live mode
# ---------------------------------------------------------------------------
async def _evaluate_live(state: dict[str, Any], questions: dict[str, dict[str, Any]]) -> JevResult:
    payload = {"state": state, "model": settings.JEV_MODEL, "questions": questions}
    headers = {
        "Authorization": f"Bearer {settings.TYPESAFE_API_KEY}",
        "Content-Type": "application/json",
    }
    backoff = INITIAL_BACKOFF_SECONDS
    start = time.perf_counter()
    data: dict[str, Any] = {}
    async with httpx.AsyncClient(timeout=JEV_TIMEOUT_SECONDS) as client:
        for attempt in range(MAX_ATTEMPTS):
            try:
                resp = await client.post(settings.JEV_API_URL, json=payload, headers=headers)
            except httpx.HTTPError as exc:
                if attempt == MAX_ATTEMPTS - 1:
                    raise JevError(f"Jev request failed after {MAX_ATTEMPTS} attempts: {exc}") from exc
                await asyncio.sleep(backoff)
                backoff *= 2
                continue
            if resp.status_code in RETRYABLE_STATUS_CODES and attempt < MAX_ATTEMPTS - 1:
                await asyncio.sleep(backoff)
                backoff *= 2
                continue
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise JevError(f"Jev API returned {resp.status_code}: {resp.text[:300]}") from exc
            data = resp.json()
            break
    latency_ms = int((time.perf_counter() - start) * 1000)
    usage = data.get("usage", {}) or {}
    input_tokens = int(usage.get("input_tokens", 0) or 0)
    cost_usd = input_tokens * settings.JEV_PRICE_PER_M_INPUT / 1_000_000
    return JevResult(
        answers=data.get("answers", {}) or {},
        mode="live",
        model=settings.JEV_MODEL,
        latency_ms=latency_ms,
        input_tokens=input_tokens,
        cost_usd=cost_usd,
        questions=len(questions),
    )


# ---------------------------------------------------------------------------
# Simulated mode - heuristic engine
# ---------------------------------------------------------------------------
HEDGE_RE = re.compile(
    r"hard to tell|not sure|unsure|unclear|maybe|possibly|i think|honestly|"
    r"can'?t tell|difficult to (?:say|tell)|a little unclear",
    re.I,
)
HEDGE_WINDOW = 60


def _hedge_nearby(text: str, start: int, end: int) -> bool:
    lo = max(0, start - HEDGE_WINDOW)
    hi = min(len(text), end + HEDGE_WINDOW)
    return bool(HEDGE_RE.search(text[lo:hi]))


# Ordered (pattern, level, base_confidence) rules per RACE score item.
# First match wins; put the most specific phrases first.
SCORE_RULES: dict[str, list[tuple[re.Pattern, int, float]]] = {
    "face": [
        (re.compile(r"no facial droop|face(?:'s| is)? symmetric|smile(?:'s| is)? symmetric|no facial asymmetry|denies facial droop|no droop noted", re.I), 0, 0.92),
        (re.compile(r"(?:big|severe|significant|profound|complete|dense|marked)\w*\s+(?:left |right )?facial droop|facial droop.{0,20}(?:severe|significant|complete|profound)|can'?t move (?:one side of )?(?:his|her|their) face|one side of (?:his|her|their) face (?:doesn'?t|does not) move", re.I), 2, 0.9),
        (re.compile(r"facial droop|(?:slight|mild|minor|small)\s+droop|droop(?:ing)? on the (?:left|right) side of (?:his|her|their) mouth|facial asymmetry", re.I), 1, 0.78),
    ],
    "arm": [
        (re.compile(r"arms? (?:are|is) (?:strong|equal|normal)|no (?:arm )?drift|holding both arms up (?:fine|well|no problem)|no weakness in (?:the |his |her )?arms?", re.I), 0, 0.9),
        (re.compile(r"can'?t lift (?:the )?(?:left\s+|right\s+)?arm at all|arm(?:'s| is)? flaccid|no effort against gravity.{0,20}arm|arm falls? (?:immediately|right away)|(?:left|right) side'?s? pretty much flaccid", re.I), 2, 0.9),
        (re.compile(r"arm drifts?|drifts down.{0,15}arm|arm.{0,15}drifts down|some effort (?:against|vs\.?) gravity.{0,20}arm|arm.{0,20}some effort (?:against|vs\.?) gravity", re.I), 1, 0.8),
        (re.compile(r"arm weakness|weak(?:ness)? in (?:the |his |her )?arm|arm.{0,15}weak", re.I), 1, 0.7),
    ],
    "leg": [
        (re.compile(r"legs? (?:are|is) strong|no (?:leg )?drift|moving (?:everything|both legs) (?:fine|well)", re.I), 0, 0.9),
        (re.compile(r"can'?t lift (?:the )?(?:left\s+|right\s+)?leg at all|leg.{0,20}no effort against gravity", re.I), 2, 0.9),
        (re.compile(r"leg drifts?|drifts down.{0,15}leg|leg.{0,15}drifts", re.I), 1, 0.8),
        (re.compile(r"leg weakness|weak(?:ness)? in (?:the |his |her )?leg|leg.{0,15}weak", re.I), 1, 0.7),
    ],
    "gaze": [
        (re.compile(r"no gaze deviation|eyes (?:are|were) following (?:me|us) (?:fine|normally)|no head.{0,5}gaze deviation", re.I), 0, 0.9),
        (re.compile(r"eyes?(?:\s+(?:are|were|is))?\s+deviated|gaze\s*(?:is|was)?\s*deviated|head\s*(?:is|was)?\s*turned to (?:the\s+)?(?:left|right)", re.I), 1, 0.85),
    ],
    "cortical": [
        (re.compile(r"no aphasia|naming things correctly|recogni[sz]es (?:his|her|their) (?:weak |left |right )?arm|follows commands? (?:fine|well|normally)", re.I), 0, 0.85),
        (re.compile(r"(?:doesn'?t|does not) recogni[sz]e (?:his|her|their) (?:left\s+|right\s+)?arm|expressive aphasia|can'?t get (?:his|her|their) words out|can'?t follow (?:two )?commands|can'?t speak", re.I), 1, 0.8),
    ],
}

# Default level-0-weighted prior when an item is never mentioned at all.
def _default_probs(n_levels: int) -> list[float]:
    if n_levels == 2:
        return [0.7, 0.3]
    weights = [0.55] + [0.3, 0.15][: n_levels - 1]
    while len(weights) < n_levels:
        weights.append(0.05)
    total = sum(weights)
    return [w / total for w in weights]


def _spread(n_levels: int, chosen: int, peak: float) -> list[float]:
    remainder = max(0.0, 1.0 - peak)
    others = [i for i in range(n_levels) if i != chosen]
    if not others:
        return [peak]
    weights = [1.0 / abs(i - chosen) for i in others]
    total_w = sum(weights)
    probs = [0.0] * n_levels
    probs[chosen] = peak
    for i, w in zip(others, weights):
        probs[i] = remainder * (w / total_w)
    return probs


SCORE_LEVEL_COUNTS = {"face": 3, "arm": 3, "leg": 3, "gaze": 2, "cortical": 3}


def _analyze_score_item(item_id: str, text: str, n_levels: int) -> tuple[list[float], float, float]:
    """Returns (probabilities over level indices, confidence, mentioned)."""
    rules = SCORE_RULES.get(item_id, [])
    for pattern, level, base_confidence in rules:
        m = pattern.search(text)
        if m:
            hedged = _hedge_nearby(text, m.start(), m.end())
            confidence = base_confidence * 0.55 if hedged else base_confidence
            mentioned = 0.7 if hedged else 0.9
            probs = _spread(n_levels, level, confidence)
            return probs, confidence, mentioned
    return _default_probs(n_levels), 0.35, 0.1


# Choice items: weak_side + MEDEVAC lines l3-l9.
# Each entry: ordered list of (pattern, option_key, base_confidence).
CHOICE_RULES: dict[str, list[tuple[re.Pattern, str, float]]] = {
    "l3": [
        (re.compile(r"urgent surgical", re.I), "B", 0.92),
        (re.compile(r"\burgent\b", re.I), "A", 0.85),
        (re.compile(r"\bpriority\b", re.I), "C", 0.85),
        (re.compile(r"\broutine\b", re.I), "D", 0.8),
        (re.compile(r"\bconvenience\b", re.I), "E", 0.8),
    ],
    "l4": [
        (re.compile(r"\bhoist\b", re.I), "B", 0.88),
        (re.compile(r"extraction equipment", re.I), "C", 0.88),
        (re.compile(r"\bventilator\b", re.I), "D", 0.88),
        (re.compile(r"none needed|no special equipment|special equipment,?\s*none", re.I), "A", 0.9),
    ],
    "l5": [
        (re.compile(r"\blitter\b.*\bambulatory\b|\bambulatory\b.*\blitter\b", re.I), "Both", 0.85),
        (re.compile(r"\blitter\b", re.I), "L", 0.85),
        (re.compile(r"\bambulatory\b", re.I), "A", 0.85),
    ],
    "l6": [
        (re.compile(r"possible enemy", re.I), "P", 0.85),
        (re.compile(r"armed escort", re.I), "X", 0.85),
        (re.compile(r"no enemy", re.I), "N", 0.88),
        (re.compile(r"enemy (?:troops? )?in the area|enemy activity|approach with caution", re.I), "E", 0.75),
    ],
    "l7": [
        (re.compile(r"\bsmoke\b", re.I), "C", 0.85),
        (re.compile(r"\bpanels?\b", re.I), "A", 0.85),
        (re.compile(r"pyrotechnic", re.I), "B", 0.85),
        (re.compile(r"no marking|none", re.I), "D", 0.75),
    ],
    "l8": [
        (re.compile(r"us military|u\.s\.? military|american military", re.I), "A", 0.9),
        (re.compile(r"us civilian|u\.s\.? civilian", re.I), "B", 0.85),
        (re.compile(r"non-?us military", re.I), "C", 0.85),
        (re.compile(r"non-?us civilian", re.I), "D", 0.85),
        (re.compile(r"\bepw\b|enemy prisoner", re.I), "E", 0.85),
    ],
    "l9": [
        (re.compile(r"\bnbc\b.{0,15}(?:nothing|none|all clear)|no (?:nbc|contamination)|clear of (?:nbc|contamination)", re.I), "N", 0.9),
        (re.compile(r"\bchemical\b", re.I), "C", 0.85),
        (re.compile(r"\bbiological\b", re.I), "B", 0.85),
        (re.compile(r"\bradiological\b", re.I), "R", 0.85),
        (re.compile(r"\bnuclear\b", re.I), "NUC", 0.85),
    ],
}

WEAKNESS_KEYWORDS_RE = re.compile(r"arm|leg|facial|face|droop|flaccid|weak|drift", re.I)
LEFT_RE = re.compile(r"\bleft\b", re.I)
RIGHT_RE = re.compile(r"\bright\b", re.I)


def _analyze_weak_side(text: str) -> tuple[str, float, float]:
    clauses = re.split(r"[.;]|,\s*(?=[a-z])", text)
    left_hits = right_hits = 0
    hedge_hit = False
    for clause in clauses:
        if WEAKNESS_KEYWORDS_RE.search(clause):
            if LEFT_RE.search(clause):
                left_hits += 1
            if RIGHT_RE.search(clause):
                right_hits += 1
            if HEDGE_RE.search(clause):
                hedge_hit = True
    if left_hits and right_hits:
        key, base_conf = "bilateral", 0.75
    elif left_hits:
        key, base_conf = "left", 0.85
    elif right_hits:
        key, base_conf = "right", 0.85
    else:
        key, base_conf = "none_reported", 0.5
    confidence = base_conf * 0.6 if hedge_hit else base_conf
    mentioned = 0.85 if (left_hits or right_hits) else 0.15
    return key, confidence, mentioned


def _analyze_choice_item(item_id: str, text: str, option_keys: list[str]) -> tuple[str, float, float]:
    rules = CHOICE_RULES.get(item_id, [])
    matches: list[tuple[int, int, str, float]] = []
    for pattern, key, base_confidence in rules:
        m = pattern.search(text)
        if m:
            matches.append((m.start(), m.end(), key, base_confidence))
    if not matches:
        fallback = option_keys[0] if option_keys else ""
        return fallback, 0.3, 0.1
    matches.sort(key=lambda t: t[0])
    distinct_keys = {k for _, _, k, _ in matches}
    start, end, key, base_confidence = matches[0]
    hedged = _hedge_nearby(text, start, end) or len(distinct_keys) > 1
    confidence = base_confidence * 0.5 if hedged else base_confidence
    mentioned = 0.85
    return key, confidence, mentioned


# Flags: simple present/absent nouls, keyed directly by flag question id.
FLAG_RULES: dict[str, tuple[list[re.Pattern], list[re.Pattern]]] = {
    "flag_seizure": (
        [re.compile(r"seizure activity witnessed|witnessed (?:a )?seizure|had a seizure|seizure at onset|seizing", re.I)],
        [re.compile(r"no seizure|denies seizure|no seizures witnessed", re.I)],
    ),
    "flag_head_trauma": (
        [re.compile(r"head trauma|hit (?:his|her|their) head|fell and hit|visible head injury|laceration to the head", re.I)],
        [re.compile(r"no (?:head )?trauma|no evidence of trauma|nothing to suggest trauma", re.I)],
    ),
    "flag_anticoagulant": (
        [re.compile(r"on (?:a )?blood thinner|on eliquis|on warfarin|on coumadin|on xarelto|anticoagulant|antiplatelet", re.I)],
        [re.compile(r"no blood thinners|not on any blood thinners|no anticoagulant|denies blood thinners", re.I)],
    ),
}


def _analyze_flag(flag_id: str, text: str) -> float:
    positive, negative = FLAG_RULES.get(flag_id, ([], []))
    for pat in negative:
        if pat.search(text):
            return 0.04
    for pat in positive:
        if pat.search(text):
            return 0.9
    return 0.08


def _report_text(state: dict[str, Any]) -> str:
    return str(state.get("report", ""))


def _estimate_tokens(text: str, questions: dict[str, dict[str, Any]]) -> int:
    return max(1, len(text) // 4) + len(questions) * 12


def _mentioned_value(base_item: str, text: str) -> float:
    if base_item in SCORE_RULES:
        n_levels = SCORE_LEVEL_COUNTS.get(base_item, 3)
        _, _, mentioned = _analyze_score_item(base_item, text, n_levels)
        return mentioned
    if base_item == "weak_side":
        _, _, mentioned = _analyze_weak_side(text)
        return mentioned
    if base_item in CHOICE_RULES:
        _, _, mentioned = _analyze_choice_item(base_item, text, [])
        return mentioned
    return 0.1


def _simulate_answer(question_id: str, spec: dict[str, Any], text: str) -> dict[str, Any]:
    qtype = spec.get("type")
    if qtype == "noul":
        if question_id.startswith("mentioned_"):
            base_item = question_id[len("mentioned_"):]
            mentioned = _mentioned_value(base_item, text)
            return {"type": "noul", "noul": round(mentioned, 3)}
        return {"type": "noul", "noul": round(_analyze_flag(question_id, text), 3)}

    if qtype == "score":
        levels: list[str] = spec.get("criteria", [])
        probs, confidence, _mentioned = _analyze_score_item(question_id, text, len(levels))
        score = sum(i * p for i, p in enumerate(probs))
        return {
            "type": "score",
            "score": round(score, 3),
            "legend": {str(i): lvl for i, lvl in enumerate(levels)},
            "probabilities": {str(i): round(p, 3) for i, p in enumerate(probs)},
            "confidence": round(confidence, 3),
        }

    if qtype == "choice":
        criteria: dict[str, str] = spec.get("criteria", {})
        option_keys = list(criteria.keys())
        if question_id == "weak_side":
            key, confidence, _mentioned = _analyze_weak_side(text)
        else:
            key, confidence, _mentioned = _analyze_choice_item(question_id, text, option_keys)
        if key not in option_keys and option_keys:
            key = option_keys[0]
        probs = {}
        if option_keys:
            idx = option_keys.index(key)
            spread = _spread(len(option_keys), idx, confidence)
            probs = {k: round(p, 3) for k, p in zip(option_keys, spread)}
        return {
            "type": "choice",
            "choice": key,
            "probabilities": probs,
            "confidence": round(confidence, 3),
        }

    raise ValueError(f"Unknown question type for {question_id!r}: {qtype!r}")


async def _evaluate_simulated(state: dict[str, Any], questions: dict[str, dict[str, Any]]) -> JevResult:
    start = time.perf_counter()
    await asyncio.sleep(random.uniform(0.09, 0.22))
    text = _report_text(state)
    answers = {qid: _simulate_answer(qid, spec, text) for qid, spec in questions.items()}
    latency_ms = int((time.perf_counter() - start) * 1000)
    input_tokens = _estimate_tokens(text, questions)
    cost_usd = input_tokens * settings.JEV_PRICE_PER_M_INPUT / 1_000_000
    return JevResult(
        answers=answers,
        mode="simulated",
        model=settings.JEV_MODEL,
        latency_ms=latency_ms,
        input_tokens=input_tokens,
        cost_usd=cost_usd,
        questions=len(questions),
    )


# Public helper for assessment_service: which noul-mentioned analyzer applies
# to a given base item id (score item vs. choice item), used to build the
# `mentioned_<item>` question set uniformly for both protocol packs.
def is_score_item(item_id: str) -> bool:
    return item_id in SCORE_RULES


def is_choice_item(item_id: str) -> bool:
    return item_id in CHOICE_RULES or item_id == "weak_side"
