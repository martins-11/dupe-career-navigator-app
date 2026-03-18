"use client";

import { useEffect, useMemo, useState } from "react";
import RoleCard from "../explore/role-card";
import { getExploreRecommendationsPool } from "@/lib/recommendationsPoolClient";

interface RecommendationGridProps {
  personaId: string;
  showAnalysis?: boolean;
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

    const wanted = selectedSkills.map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (wanted.length > 0) {
      const matchesAny = wanted.some((key) => roleSkills.some((rs) => rs.includes(key)));
      if (!matchesAny) return false;
    }
  }

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
  /** Cards view of AI recommendations. Palette constrained via semantic tokens. */
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [recMeta, setRecMeta] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
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
        }
      } catch (e: any) {
        if (!cancelled) {
          console.error("Recommendations fetch failed:", e);
          setError("Recommendation service temporarily unavailable. Please try again.");
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

  useEffect(() => {
    if (!expandedRoleId) return;

    const stillVisible = visibleRoles.some((role: any, idx: number) => {
      const derivedIdRaw = role?.id ?? role?.role_id ?? role?.onet_id ?? role?.code ?? role?.title ?? role?.role_title;
      const derivedId = String(derivedIdRaw ?? "").trim();
      const stableUniqueId = derivedId !== "" ? derivedId : `role-${idx}`;
      return stableUniqueId === expandedRoleId;
    });

    if (!stillVisible) setExpandedRoleId(null);
  }, [expandedRoleId, visibleRoles]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-secondary border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground font-medium animate-pulse">Consulting the recommendation engine…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-secondary border border-border rounded-xl text-foreground max-w-2xl mx-auto">
        <p className="font-semibold">Discovery Error</p>
        <p className="text-sm mt-1 text-muted-foreground">{error}</p>
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
      <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl bg-secondary/30">
        <p className="text-muted-foreground font-medium text-lg">
          {hasFilters ? "No roles match the active filters." : "No roles found matching your persona profile."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{visibleRoles.length}</span> of{" "}
          <span className="font-semibold text-foreground">{filteredRoles.length}</span> matching role
          {filteredRoles.length === 1 ? "" : "s"}{" "}
          <span className="text-muted-foreground">
            ({allRoles.length} total received
            {recMeta?.requestedCount != null ? ` / ${recMeta.requestedCount} requested` : ""}
            )
          </span>
        </div>

        {filteredRoles.length > 5 ? (
          <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show top 5" : "Show all"}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleRoles.map((role: any, idx: number) => {
          const derivedIdRaw = role?.id ?? role?.role_id ?? role?.onet_id ?? role?.code ?? role?.title ?? role?.role_title;

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
            className="px-10 py-4 bg-primary text-primary-foreground font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ boxShadow: "0 14px 34px rgba(var(--cn-primary-rgb), 0.18)" }}
            onClick={onViewAnalysis}
          >
            Analyze Career Compatibility
          </button>
        </div>
      )}
    </div>
  );
}
