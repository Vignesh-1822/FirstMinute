import { motion, useReducedMotion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HospitalStatus, Point, Routing } from "@/types";
import { exclusionReason } from "@/lib/hospitals";
import {
  BAY_PATH,
  BRIDGES,
  MAP_HEIGHT,
  MAP_WIDTH,
  PARK_PATH,
  RIVER_PATH,
  STREETS,
  routePath,
  toMap,
} from "@/lib/riverton";
import { cn } from "@/lib/utils";

interface RivertonMapProps {
  hospitals: HospitalStatus[];
  routing: Routing | null;
  unitPosition: Point | null;
  unitId: string;
  className?: string;
}

const ED_FILL: Record<HospitalStatus["ed_status"], string> = {
  open: "var(--confident)",
  advisory: "var(--uncertain)",
  diversion: "var(--signal)",
};

const LABEL_LEFT = new Set(["riverside"]);

function HospitalNode({
  hospital,
  recommended,
  reason,
  lvo,
}: {
  hospital: HospitalStatus;
  recommended: boolean;
  reason: string | null;
  lvo: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const { x, y } = toMap(hospital);
  const left = LABEL_LEFT.has(hospital.id);
  const excluded = reason !== null;
  const accent = recommended ? (lvo ? "var(--signal)" : "var(--foreground)") : "var(--muted-foreground)";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <g
          tabIndex={0}
          role="img"
          aria-label={`${hospital.name}, ${hospital.level}, ED ${hospital.ed_status}${reason ? `, excluded: ${reason}` : ""}${recommended ? ", recommended" : ""}`}
          className="cursor-default outline-none [&:focus-visible>circle.focus]:opacity-100"
          style={{ opacity: excluded && !recommended ? 0.5 : 1 }}
        >
          <circle className="focus" cx={x} cy={y} r={9} fill="none" stroke="var(--ring)" strokeWidth={0.8} opacity={0} />
          {recommended && !reducedMotion ? (
            <motion.circle
              cx={x}
              cy={y}
              r={5}
              fill="none"
              stroke={accent}
              strokeWidth={0.8}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              style={{ transformOrigin: `${x}px ${y}px` }}
            />
          ) : null}
          <rect
            x={x - 4.5}
            y={y - 4.5}
            width={9}
            height={9}
            rx={2.4}
            fill="var(--card)"
            stroke={accent}
            strokeWidth={recommended ? 1.3 : 0.8}
            strokeDasharray={excluded ? "1.6 1.2" : undefined}
          />
          <path d={`M ${x} ${y - 2.3} V ${y + 2.3} M ${x - 2.3} ${y} H ${x + 2.3}`} stroke={accent} strokeWidth={1.1} strokeLinecap="round" />
          <circle cx={x + 4.2} cy={y - 4.2} r={1.5} fill={ED_FILL[hospital.ed_status]} stroke="var(--card)" strokeWidth={0.6} />
          <text
            x={left ? x - 7.5 : x + 7.5}
            y={y - 0.6}
            textAnchor={left ? "end" : "start"}
            className={cn("font-sans", recommended ? "fill-foreground" : "fill-muted-foreground")}
            style={{ fontSize: 5.4, fontWeight: recommended ? 600 : 500, paintOrder: "stroke", stroke: "var(--map-land)", strokeWidth: 2.2 }}
          >
            {hospital.short_name}
          </text>
          <text
            x={left ? x - 7.5 : x + 7.5}
            y={y + 5.4}
            textAnchor={left ? "end" : "start"}
            className="fill-faint font-mono"
            style={{ fontSize: 3.9, letterSpacing: 0.2, paintOrder: "stroke", stroke: "var(--map-land)", strokeWidth: 2 }}
          >
            {hospital.level}
            {excluded ? " · excluded" : ""}
          </text>
        </g>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-60">
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{hospital.name}</span>
          <span className="opacity-80">
            {hospital.level} · ED {hospital.ed_status} · CT {hospital.ct_available ? "yes" : "no"} · IR {hospital.neuro_ir_available ? "yes" : "no"}
          </span>
          {reason ? <span className="opacity-90">Excluded: {reason}</span> : null}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Stylised Riverton: river, bay, arterials, five hospitals with live status,
 * the ambulance and an animated street-following route to the recommendation.
 */
export function RivertonMap({ hospitals, routing, unitPosition, unitId, className }: RivertonMapProps) {
  const reducedMotion = useReducedMotion();
  const recommendedId = routing?.recommended.hospital.id ?? null;
  const target = routing ? hospitals.find((hospital) => hospital.id === recommendedId) ?? routing.recommended.hospital : null;
  const route = unitPosition && target ? routePath(unitPosition, target) : null;
  const unit = unitPosition ? toMap(unitPosition) : null;
  const lvo = routing?.lvo_suspected ?? false;
  const routeColor = lvo ? "var(--signal)" : "var(--foreground)";

  return (
    <div className={cn("relative overflow-hidden bg-map-land bg-dot-grid", className)}>
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        role="group"
        aria-label="Riverton map with hospitals and ambulance position"
      >
        <path d={BAY_PATH} fill="var(--map-water)" />
        <path d={RIVER_PATH} fill="none" stroke="var(--map-water)" strokeWidth={7} strokeLinecap="round" />
        <path d={PARK_PATH} fill="var(--foreground)" opacity={0.035} />
        {STREETS.map((street) => (
          <path
            key={street.id}
            d={street.d}
            fill="none"
            stroke="var(--map-street)"
            strokeWidth={street.major ? 1.8 : 0.8}
            strokeLinecap="round"
          />
        ))}
        {BRIDGES.map((bridge) => (
          <g key={`${bridge.x}-${bridge.y}`} stroke="var(--muted-foreground)" strokeWidth={0.5} opacity={0.5}>
            <path d={`M ${bridge.x - 5} ${bridge.y - 1.6} H ${bridge.x + 5} M ${bridge.x - 5} ${bridge.y + 1.6} H ${bridge.x + 5}`} />
          </g>
        ))}
        <text x={112} y={126} className="fill-faint font-mono" style={{ fontSize: 3.6, letterSpacing: 0.6 }} transform="rotate(-62 112 126)">
          RIVERTON RIVER
        </text>

        {route ? (
          <g>
            <path d={route} fill="none" stroke={routeColor} strokeOpacity={0.14} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            <motion.path
              key={route}
              d={route}
              fill="none"
              stroke={routeColor}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
            {!reducedMotion ? (
              <circle r={1.6} fill={routeColor}>
                <animateMotion dur="2.6s" repeatCount="indefinite" path={route} />
              </circle>
            ) : null}
          </g>
        ) : null}

        {hospitals.map((hospital) => (
          <HospitalNode
            key={hospital.id}
            hospital={hospital}
            recommended={hospital.id === recommendedId}
            reason={exclusionReason(hospital, routing)}
            lvo={lvo}
          />
        ))}

        {unit ? (
          <g aria-label={`Ambulance ${unitId}`} role="img">
            {!reducedMotion ? (
              <motion.circle
                cx={unit.x}
                cy={unit.y}
                r={3.5}
                fill="var(--foreground)"
                initial={{ scale: 1, opacity: 0.35 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                style={{ transformOrigin: `${unit.x}px ${unit.y}px` }}
              />
            ) : null}
            <circle cx={unit.x} cy={unit.y} r={3.2} fill="var(--foreground)" stroke="var(--card)" strokeWidth={1.2} />
            <rect x={unit.x - 9} y={unit.y + 5} width={18} height={7} rx={3.5} fill="var(--foreground)" />
            <text x={unit.x} y={unit.y + 9.9} textAnchor="middle" className="fill-background font-mono" style={{ fontSize: 3.9, fontWeight: 600 }}>
              {unitId}
            </text>
          </g>
        ) : null}
      </svg>

      <div className="pointer-events-none absolute right-2.5 bottom-2 flex items-center gap-2 font-mono text-[9.5px] text-faint">
        <span className="flex items-center gap-1">
          <span className="h-px w-[38px] bg-faint" />2 km
        </span>
        <span>N↑</span>
      </div>
    </div>
  );
}
