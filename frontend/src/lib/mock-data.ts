// Mock data for PromptLab

export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    username: string;
    name: string;
    avatar: string;
  };
  category: 'Dev' | 'Marketing' | 'Design' | 'Edu' | 'Data';
  tags: string[];
  stars: number;
  forks: number;
  model: string;
  temperature: number;
  maxTokens: number;
  createdAt: string;
  updatedAt: string;
  versions: PromptVersion[];
  comments: Comment[];
  executions: Execution[];
}

export interface PromptVersion {
  version: string;
  content: string;
  commitMessage: string;
  createdAt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  description?: string;
}

export interface Comment {
  id: string;
  author: {
    username: string;
    name: string;
    avatar: string;
  };
  content: string;
  createdAt: string;
  replies?: Comment[];
}

export interface Execution {
  id: string;
  model: string;
  input: string;
  output: string;
  timestamp: string;
  duration: number;
}

export const mockPrompts: Prompt[] = [
  {
    id: '1',
    title: 'Code Review Assistant',
    description: '코드 리뷰를 자동화하고 개선 사항을 제안하는 프롬프트',
    content: `You are an expert code reviewer. Analyze the following code and provide:
1. Potential bugs or issues
2. Performance improvements
3. Best practices recommendations
4. Security concerns

Code:
{code}

Please provide detailed feedback in a structured format.`,
    author: {
      username: 'dev_master',
      name: '김개발',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev_master'
    },
    category: 'Dev',
    tags: ['code-review', 'development', 'quality'],
    stars: 1247,
    forks: 89,
    model: 'GPT-4',
    temperature: 0.3,
    maxTokens: 2000,
    createdAt: '2025-10-15',
    updatedAt: '2025-10-28',
    versions: [
      {
        version: 'v2.0',
        content: `You are an expert code reviewer. Analyze the following code and provide:
1. Potential bugs or issues
2. Performance improvements
3. Best practices recommendations
4. Security concerns

Code:
{code}

Please provide detailed feedback in a structured format.`,
        commitMessage: 'Added security concerns section',
        createdAt: '2025-10-28',
        model: 'GPT-4',
        temperature: 0.3,
        maxTokens: 2000,
        description: '보안 우려 사항 섹션 추가 및 프롬프트 개선'
      },
      {
        version: 'v1.0',
        content: `You are an expert code reviewer. Analyze the following code and provide:
1. Potential bugs or issues
2. Performance improvements
3. Best practices recommendations

Code:
{code}

Please provide detailed feedback.`,
        commitMessage: 'Initial commit',
        createdAt: '2025-10-15',
        model: 'GPT-4',
        temperature: 0.5,
        maxTokens: 1500,
        description: '코드 리뷰 어시스턴트 초기 버전'
      }
    ],
    comments: [],
    executions: []
  },
  {
    id: '2',
    title: 'Marketing Copy Generator',
    description: '타겟 고객을 위한 매력적인 마케팅 카피를 생성합니다',
    content: `Create compelling marketing copy for the following product:

Product: {product_name}
Target Audience: {target_audience}
Key Benefits: {benefits}
Tone: {tone}

Generate:
1. Headline (60 characters max)
2. Subheadline (120 characters max)
3. Body copy (200 words)
4. Call-to-action

Make it persuasive and engaging.`,
    author: {
      username: 'marketing_pro',
      name: '박마케터',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marketing_pro'
    },
    category: 'Marketing',
    tags: ['copywriting', 'marketing', 'sales'],
    stars: 892,
    forks: 156,
    model: 'GPT-4',
    temperature: 0.8,
    maxTokens: 1500,
    createdAt: '2025-10-10',
    updatedAt: '2025-10-25',
    versions: [],
    comments: [],
    executions: []
  },
  {
    id: '3',
    title: 'Design System Documentation',
    description: '디자인 시스템 컴포넌트의 문서를 자동으로 생성합니다',
    content: `Generate comprehensive documentation for a design system component:

Component Name: {component_name}
Purpose: {purpose}
Props: {props}

Include:
1. Overview
2. Usage examples
3. Props table with types and descriptions
4. Accessibility guidelines
5. Best practices

Format in Markdown.`,
    author: {
      username: 'design_guru',
      name: '이디자인',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=design_guru'
    },
    category: 'Design',
    tags: ['design-system', 'documentation', 'ui-ux'],
    stars: 654,
    forks: 43,
    model: 'Claude',
    temperature: 0.5,
    maxTokens: 2500,
    createdAt: '2025-10-20',
    updatedAt: '2025-10-30',
    versions: [],
    comments: [],
    executions: []
  },
  {
    id: '4',
    title: 'Data Analysis Report',
    description: 'CSV 데이터를 분석하고 인사이트를 도출합니다',
    content: `Analyze the following dataset and provide insights:

Dataset: {dataset}
Focus Areas: {focus_areas}

Provide:
1. Summary statistics
2. Key trends and patterns
3. Anomalies or outliers
4. Actionable recommendations
5. Visualizations suggestions

Present findings in a clear, business-friendly format.`,
    author: {
      username: 'data_scientist',
      name: '최데이터',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=data_scientist'
    },
    category: 'Data',
    tags: ['data-analysis', 'insights', 'reporting'],
    stars: 1089,
    forks: 124,
    model: 'GPT-4',
    temperature: 0.4,
    maxTokens: 3000,
    createdAt: '2025-10-05',
    updatedAt: '2025-10-22',
    versions: [],
    comments: [],
    executions: []
  },
  {
    id: '5',
    title: 'Interview Question Generator',
    description: '직무별 맞춤형 면접 질문을 생성합니다',
    content: `Generate interview questions for the following position:

Position: {position}
Experience Level: {level}
Key Skills: {skills}
Company Culture: {culture}

Create 10 questions including:
- Technical questions (40%)
- Behavioral questions (40%)
- Culture fit questions (20%)

Include what to look for in answers.`,
    author: {
      username: 'hr_expert',
      name: '정인사',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hr_expert'
    },
    category: 'Edu',
    tags: ['hr', 'recruiting', 'interview'],
    stars: 723,
    forks: 98,
    model: 'GPT-4',
    temperature: 0.6,
    maxTokens: 2000,
    createdAt: '2025-10-12',
    updatedAt: '2025-10-29',
    versions: [],
    comments: [],
    executions: []
  },
  {
    id: '6',
    title: 'API Documentation Writer',
    description: 'RESTful API 엔드포인트의 문서를 자동 생성합니다',
    content: `Generate API documentation for the following endpoint:

Endpoint: {endpoint}
Method: {method}
Parameters: {parameters}
Response: {response}

Include:
1. Description
2. Authentication requirements
3. Request parameters table
4. Response format
5. Example requests/responses
6. Error codes and handling

Use OpenAPI 3.0 format.`,
    author: {
      username: 'dev_master',
      name: '김개발',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev_master'
    },
    category: 'Dev',
    tags: ['api', 'documentation', 'backend'],
    stars: 945,
    forks: 67,
    model: 'GPT-4',
    temperature: 0.3,
    maxTokens: 2500,
    createdAt: '2025-10-18',
    updatedAt: '2025-10-31',
    versions: [],
    comments: [],
    executions: []
  }
];

export const categoryInfo = {
  Dev: {
    name: '개발',
    description: '코드 리뷰, 디버깅, 문서화 등',
    color: 'bg-purple-500',
    icon: 'Code2'
  },
  Marketing: {
    name: '마케팅',
    description: '카피라이팅, 캠페인, SNS 콘텐츠',
    color: 'bg-pink-500',
    icon: 'Megaphone'
  },
  Design: {
    name: '디자인',
    description: 'UI/UX, 디자인 시스템, 프로토타입',
    color: 'bg-fuchsia-500',
    icon: 'Palette'
  },
  Edu: {
    name: 'HR/교육',
    description: '채용, 교육 콘텐츠, 평가',
    color: 'bg-violet-500',
    icon: 'GraduationCap'
  },
  Data: {
    name: '데이터',
    description: '분석, 리포팅, 인사이트 도출',
    color: 'bg-purple-600',
    icon: 'BarChart'
  }
};

export const trendingPrompts = mockPrompts.slice(0, 3);
export const newPrompts = mockPrompts.slice(3, 6);
