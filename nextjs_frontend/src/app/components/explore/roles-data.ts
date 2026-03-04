/**
 * Explore Role UI type.
 *
 * NOTE:
 * The Explore UI previously used mock/static arrays (ROLES, INDUSTRIES, ALL_SKILLS, JOB_TITLES).
 * This file now only contains the UI-facing Role interface so the Explore components keep their
 * type expectations while data comes from the backend API.
 */

export interface Role {
  id: string;
  title: string;
  industry: string;
  salaryMin: number;
  salaryMax: number;
  experience: string;
  skills: string[];
  expandedSkills: string[];
  description: string;
  responsibilities: string[];
  careerLevel: string;

  /**
   * Optional 3/2 report coming from backend role search results.
   * Used to render Mastery (green) / Growth (amber) tags and show scoring.
   *
   * Backend is expected to provide:
   * - masteryAreas: string[]
   * - growthAreas: string[]
   * - compatibilityScore: number (0-100)
   */
  threeTwoReport?:
    | {
        status?: 'validated' | 'not_validated' | 'fallback' | string;
        masteryAreas?: string[];
        growthAreas?: string[];
        missingSkills?: string[];
        score?: number;
        compatibilityScore?: number;
        /** Legacy numeric fields (kept for backward compatibility). */
        mastery?: number;
        growth?: number;
      }
    | null;
}
