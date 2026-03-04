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
   * Used to render Mastery (green) / Growth (amber) tags in the Explore cards.
   */
  threeTwoReport?: {
    mastery?: number;
    growth?: number;
  } | null;
}
