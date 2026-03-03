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
}

export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Marketing",
  "Education",
  "E-Commerce",
  "Consulting",
  "Manufacturing",
];

export const ALL_SKILLS = [
  "Python",
  "JavaScript",
  "React",
  "Node.js",
  "SQL",
  "Machine Learning",
  "Data Analysis",
  "AWS",
  "Docker",
  "TypeScript",
  "Java",
  "Product Management",
  "UI/UX Design",
  "Figma",
  "Agile",
  "Project Management",
  "Communication",
  "Leadership",
  "Excel",
  "Tableau",
];

export const JOB_TITLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Data Analyst",
  "Product Manager",
  "UX Designer",
  "DevOps Engineer",
  "Machine Learning Engineer",
  "Cloud Architect",
  "Technical Lead",
  "Engineering Manager",
  "Business Analyst",
];

export const ROLES: Role[] = [
  {
    id: "1",
    title: "Senior Software Engineer",
    industry: "Technology",
    salaryMin: 18,
    salaryMax: 35,
    experience: "5-8 years",
    skills: ["Python", "React", "AWS"],
    expandedSkills: ["Python", "React", "AWS", "Docker", "System Design", "Microservices"],
    description:
      "Responsible for building scalable backend systems, collaborating across teams, and optimizing performance of distributed applications.",
    responsibilities: [
      "Design and develop scalable architecture",
      "Collaborate with product and frontend teams",
      "Optimize performance and maintain security",
    ],
    careerLevel: "Senior-Level",
  },
  {
    id: "2",
    title: "Data Scientist",
    industry: "Finance",
    salaryMin: 15,
    salaryMax: 30,
    experience: "3-6 years",
    skills: ["Python", "Machine Learning", "SQL"],
    expandedSkills: ["Python", "Machine Learning", "SQL", "TensorFlow", "Statistical Modeling", "Data Visualization"],
    description:
      "Analyze complex financial datasets to derive actionable insights. Build predictive models for risk assessment and portfolio optimization.",
    responsibilities: [
      "Build and validate predictive ML models",
      "Perform exploratory data analysis on large datasets",
      "Present data-driven recommendations to stakeholders",
    ],
    careerLevel: "Mid-Level",
  },
  {
    id: "3",
    title: "Product Manager",
    industry: "E-Commerce",
    salaryMin: 20,
    salaryMax: 40,
    experience: "4-7 years",
    skills: ["Product Management", "Agile", "Data Analysis"],
    expandedSkills: ["Product Management", "Agile", "Data Analysis", "Roadmapping", "A/B Testing", "User Research"],
    description:
      "Own the product roadmap end-to-end. Collaborate with engineering, design, and marketing to deliver features that drive user growth.",
    responsibilities: [
      "Define product vision and strategic roadmap",
      "Prioritize features based on user impact and business goals",
      "Coordinate cross-functional teams for timely delivery",
    ],
    careerLevel: "Senior-Level",
  },
  {
    id: "4",
    title: "UX Designer",
    industry: "Technology",
    salaryMin: 12,
    salaryMax: 25,
    experience: "3-5 years",
    skills: ["Figma", "UI/UX Design", "Communication"],
    expandedSkills: ["Figma", "UI/UX Design", "Communication", "Prototyping", "User Research", "Design Systems"],
    description:
      "Create intuitive and delightful user experiences. Conduct user research, build prototypes, and iterate on designs based on feedback.",
    responsibilities: [
      "Conduct user research and usability testing",
      "Design wireframes, prototypes, and high-fidelity mockups",
      "Maintain and evolve the design system",
    ],
    careerLevel: "Mid-Level",
  },
  {
    id: "5",
    title: "DevOps Engineer",
    industry: "Technology",
    salaryMin: 16,
    salaryMax: 32,
    experience: "4-6 years",
    skills: ["AWS", "Docker", "Python"],
    expandedSkills: ["AWS", "Docker", "Python", "Kubernetes", "Terraform", "CI/CD Pipelines"],
    description:
      "Build and maintain CI/CD pipelines for rapid deployment. Manage cloud infrastructure and ensure 99.9% uptime for production systems.",
    responsibilities: [
      "Design and maintain automated CI/CD pipelines",
      "Manage cloud infrastructure and container orchestration",
      "Monitor system health and optimize for reliability",
    ],
    careerLevel: "Mid-Level",
  },
  {
    id: "6",
    title: "Frontend Developer",
    industry: "Marketing",
    salaryMin: 10,
    salaryMax: 22,
    experience: "2-4 years",
    skills: ["React", "TypeScript", "JavaScript"],
    expandedSkills: ["React", "TypeScript", "JavaScript", "Next.js", "Tailwind CSS", "Performance Optimization"],
    description:
      "Build responsive, pixel-perfect web applications for marketing campaigns. Collaborate closely with designers to implement interactive experiences.",
    responsibilities: [
      "Implement responsive and accessible web interfaces",
      "Optimize frontend performance and loading times",
      "Collaborate with designers on interactive features",
    ],
    careerLevel: "Junior-Level",
  },
  {
    id: "7",
    title: "Machine Learning Engineer",
    industry: "Healthcare",
    salaryMin: 22,
    salaryMax: 45,
    experience: "5-8 years",
    skills: ["Python", "Machine Learning", "Data Analysis"],
    expandedSkills: ["Python", "Machine Learning", "Data Analysis", "PyTorch", "Computer Vision", "MLOps"],
    description:
      "Develop ML models for medical image analysis and patient outcome prediction. Work with clinical teams to validate model performance.",
    responsibilities: [
      "Develop and deploy production ML pipelines",
      "Collaborate with clinical teams for model validation",
      "Research and implement state-of-the-art algorithms",
    ],
    careerLevel: "Senior-Level",
  },
  {
    id: "8",
    title: "Cloud Architect",
    industry: "Consulting",
    salaryMin: 25,
    salaryMax: 50,
    experience: "7-10 years",
    skills: ["AWS", "Docker", "Leadership"],
    expandedSkills: ["AWS", "Docker", "Leadership", "Azure", "Solution Architecture", "Cost Optimization"],
    description:
      "Design enterprise-grade cloud solutions for Fortune 500 clients. Lead migration strategies and architect multi-region, fault-tolerant systems.",
    responsibilities: [
      "Architect multi-region, fault-tolerant cloud systems",
      "Lead enterprise cloud migration strategies",
      "Optimize infrastructure costs and performance",
    ],
    careerLevel: "Lead-Level",
  },
  {
    id: "9",
    title: "Business Analyst",
    industry: "Finance",
    salaryMin: 8,
    salaryMax: 18,
    experience: "2-4 years",
    skills: ["Excel", "SQL", "Communication"],
    expandedSkills: ["Excel", "SQL", "Communication", "JIRA", "Requirements Gathering", "Process Mapping"],
    description:
      "Bridge the gap between business stakeholders and technical teams. Gather requirements, document processes, and drive data-driven decisions.",
    responsibilities: [
      "Gather and document business requirements",
      "Facilitate stakeholder workshops and reviews",
      "Translate business needs into technical specifications",
    ],
    careerLevel: "Junior-Level",
  },
  {
    id: "10",
    title: "Engineering Manager",
    industry: "Technology",
    salaryMin: 30,
    salaryMax: 55,
    experience: "8-12 years",
    skills: ["Leadership", "Agile", "Project Management"],
    expandedSkills: ["Leadership", "Agile", "Project Management", "Hiring", "System Design", "Strategic Planning"],
    description:
      "Lead a team of 10+ engineers. Drive technical strategy, manage sprint planning, and foster a culture of continuous improvement and innovation.",
    responsibilities: [
      "Lead and mentor a team of 10+ engineers",
      "Drive technical strategy and architectural decisions",
      "Manage hiring, sprint planning, and team growth",
    ],
    careerLevel: "Lead-Level",
  },
];
