"use client";

import { useEffect, useMemo, useState } from "react";
import RoleCard from "../explore/role-card";
import { getExploreRecommendationsPool } from "@/lib/recommendationsPoolClient";

interface RecommendationGridProps {
  personaId: string;
  /**
   * Optional legacy prop (Explore previously rendered a "Compatibility Deep-Dive" section).
   * Kept optional to avoid forcing callers to provide unused analysis state.
   */
  showAnalysis?: boolean;
  /**
   * Optional legacy callback for the removed analysis section.
   * When omitted, the "Analyze Career Compatibility" button will not render.
   */
  onViewAnalysis?: () => void;
  filters?: {
    industry?: string;
    skills?: string[];
    title?: string;
    salaryRange?: [number, number];
  };
}

function normString(v: unknown): string {
  return String(v ?? "").trim();
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => normString(x)).filter(Boolean);
}

function parseSalaryRangeToLakhs(role: any): { min: number | null; max: number | null } {
  /**
   * Best-effort parsing. If it fails we return nulls and salary filter becomes non-blocking
   * (i.e., role won't be excluded solely due to missing/unknown salary).
   *
   * NOTE: Many seed payloads store salary_range as text (e.g. "10-18 LPA").
   */
  const raw = normString(role?.salary_range ?? role?.salaryRange ?? role?.salary);
  if (!raw) return { min: null, max: null };

  const nums = raw
    .replace(/,/g, "")
    .match(/\d+(\.\d+)?/g)
    ?.map((s) => Number(s))
    .filter((n) => Number.isFinite(n));

  if (!nums || nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };

  return { min: Math.min(...nums), max: Math.max(...nums) };
}

function roleTitleFromRole(role: any): string {
  return normString(role?.title ?? role?.role_title ?? role?.roleTitle);
}

function roleMatchesFilters(params: {
  role: any;
  selectedIndustry: string;
  selectedSkills: string[];
  salaryRange: [number, number];
  titleQuery: string;
}): boolean {
  const { role, selectedIndustry, selectedSkills, salaryRange, titleQuery } = params;

  if (titleQuery) {
    const roleTitle = roleTitleFromRole(role).toLowerCase();
    if (!roleTitle.includes(titleQuery.toLowerCase())) return false;
  }

  if (selectedIndustry) {
    const industry = normString(role?.industry);
    if (!industry) return false;
    if (industry.toLowerCase() !== selectedIndustry.toLowerCase()) return false;
  }

  if (selectedSkills.length > 0) {
    const roleSkills = [
      ...safeStringArray(role?.skills_required),
      ...safeStringArray(role?.required_skills),
      ...safeStringArray(role?.skills),
    ]
      .map((s) => s.toLowerCase())
      .filter(Boolean);

    // OR semantics: if multiple skills are selected, match roles that have ANY selected skill.
    const wanted = selectedSkills.map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (wanted.length > 0) {
      const matchesAny = wanted.some((key) => roleSkills.some((rs) => rs.includes(key)));
      if (!matchesAny) return false;
    }
  }

  // Salary filter (only enforced if we can parse salary data)
  const salary = parseSalaryRangeToLakhs(role);
  if (salary.min !== null && salary.max !== null) {
    const [minWanted, maxWanted] = salaryRange;
    const overlaps = salary.max >= minWanted && salary.min <= maxWanted;
    if (!overlaps) return false;
  }

  return true;
}

// PUBLIC_INTERFACE
export function RecommendationGrid({
  personaId,
  showAnalysis = false,
  onViewAnalysis,
  filters = {},
}: RecommendationGridProps) {
  /**
   * Cards view of AI recommendations.
   *
   * IMPORTANT:
   * - We fetch/store the FULL recommendation pool (e.g., 12) so filters can match beyond the first 5.
   * - We still show only 5 initially (per UX requirement), with a "Show all" toggle.
   */
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [recMeta, setRecMeta] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only one role card expanded at a time (accordion behavior)
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  // UX: show 5 by default, allow expansion to the full filtered set.
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      if (!personaId) return;

      setLoading(true);
      setError(null);

      try {
        const allowPadding = process.env.NEXT_PUBLIC_RECOMMENDATIONS_ALLOW_PADDING === "true";

        const { roles, meta } = await getExploreRecommendationsPool({
          personaId,
          allowPadding,
        });

        if (!cancelled) {
          setAllRoles(Array.isArray(roles) ? roles : []);
          setRecMeta(meta ?? null);

          // Diagnostics (safe): helps confirm we’re reusing the same pool without UI clutter.
          if (meta && typeof meta === "object") {
            // eslint-disable-next-line no-console
            console.log("[recommendations.pool meta]", meta);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error("Recommendations fetch failed:", e);
          setError("AI Service temporarily unavailable. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [personaId]);

  // Reset "show all" when filters change so we still show 5 initially in typical flows.
  useEffect(() => {
    setShowAll(false);
  }, [personaId, filters.industry, filters.title, filters.skills, filters.salaryRange]);

  const filteredRoles = useMemo(() => {
    const selectedIndustry = normString(filters.industry);
    const selectedSkills = Array.isArray(filters.skills) ? filters.skills : [];
    const titleQuery = normString(filters.title);
    const salaryRange = Array.isArray(filters.salaryRange) ? filters.salaryRange : ([0, 60] as [number, number]);

    const hasAnyFilter =
      Boolean(titleQuery) ||
      Boolean(selectedIndustry) ||
      (selectedSkills?.length ?? 0) > 0 ||
      (salaryRange?.[0] ?? 0) !== 0 ||
      (salaryRange?.[1] ?? 60) !== 60;

    if (!hasAnyFilter) return allRoles;

    return allRoles.filter((r) =>
      roleMatchesFilters({
        role: r,
        selectedIndustry,
        selectedSkills,
        salaryRange,
        titleQuery,
      }),
    );
  }, [allRoles, filters.industry, filters.skills, filters.title, filters.salaryRange]);

  const visibleRoles = useMemo(() => {
    const MIN_ROLES = 5;
    return showAll ? filteredRoles : filteredRoles.slice(0, MIN_ROLES);
  }, [filteredRoles, showAll]);

  // If filters change and the expanded card is no longer visible, collapse it.
  useEffect(() => {
    if (!expandedRoleId) return;

    const stillVisible = visibleRoles.some((role: any, idx: number) => {
      const derivedIdRaw =
        role?.id ?? role?.role_id ?? role?.onet_id ?? role?.code ?? role?.title ?? role?.role_title;
      const derivedId = String(derivedIdRaw ?? "").trim();
      const stableUniqueId = derivedId !== "" ? derivedId : `role-${idx}`;
      return stableUniqueId === expandedRoleId;
    });

    if (!stillVisible) setExpandedRoleId(null);
  }, [expandedRoleId, visibleRoles]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-teal-100 border-t-[#0D9488] rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Consulting Bedrock for matches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-600 max-w-2xl mx-auto">
        <p className="font-semibold">Discovery Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!visibleRoles || visibleRoles.length === 0) {
    const hasFilters =
      Boolean(normString(filters.title)) ||
      Boolean(normString(filters.industry)) ||
      (Array.isArray(filters.skills) && filters.skills.length > 0) ||
      (Array.isArray(filters.salaryRange) && (filters.salaryRange[0] !== 0 || filters.salaryRange[1] !== 60));

    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
        <p className="text-slate-400 font-medium text-lg">
          {hasFilters ? "No roles match the active filters." : "No roles found matching your persona profile."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{visibleRoles.length}</span> of{" "}
          <span className="font-semibold text-slate-700">{filteredRoles.length}</span> matching role
          {filteredRoles.length === 1 ? "" : "s"}{" "}
          <span className="text-slate-400">
            ({allRoles.length} total received
            {recMeta?.requestedCount != null ? ` / ${recMeta.requestedCount} requested` : ""}
            )
          </span>
        </div>

        {filteredRoles.length > 5 ? (
          <button
            type="button"
            className="text-xs font-semibold text-[#0D9488] hover:underline"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show top 5" : "Show all"}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleRoles.map((role: any, idx: number) => {
          const derivedIdRaw =
            role?.id ??
            role?.role_id ??
            role?.onet_id ??
            role?.code ??
            role?.title ??
            role?.role_title;

          const derivedId = String(derivedIdRaw ?? "").trim();
          const stableUniqueId = derivedId !== "" ? derivedId : `role-${idx}`;

          const normalizedRole = {
            ...role,
            id: stableUniqueId,
            title: role?.title ?? role?.role_title,
          };

          return (
            <RoleCard
              key={stableUniqueId}
              role={normalizedRole}
              personaId={personaId}
              expanded={expandedRoleId === stableUniqueId}
              onExpandedChange={(next) => {
                setExpandedRoleId((prev) => {
                  if (next) return stableUniqueId;
                  return prev === stableUniqueId ? null : prev;
                });
              }}
            />
          );
        })}
      </div>

      {!showAnalysis && typeof onViewAnalysis === "function" && (
        <div className="flex justify-center pb-10">
          <button
            className="px-10 py-4 bg-[#0D9488] text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-teal-900/10"
            onClick={onViewAnalysis}
          >
            Analyze Career Compatibility
          </button>
        </div>
      )}
    </div>
  );
}
