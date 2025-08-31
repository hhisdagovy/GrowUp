import React, { useMemo, useState, createContext, useContext, useEffect } from "react";
import { auth, listenToAuth, db } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile as fbUpdateProfile, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion } from "framer-motion";
import { HashRouter as Router, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import {
  GraduationCap,
  Wallet,
  Stethoscope,
  Home,
  Briefcase,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Search,
  Sparkles,
  ShieldCheck,
  HeartHandshake,
  Calendar,
  Smartphone,
  Mail,
  Moon,
  Sun,
  Trophy,
  Target,
  Flame,
  Star,
  Award,
  Zap,
  TrendingUp,
  Crown,
  Medal,
  Rocket,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  LogOut,
  Settings,
  Save,
  Trash2,
  Download,
  Bell,
  Globe,
  Palette,
  Shield,
  AlertCircle,
  Check,
  Clock,
  X,
  Timer,
  DollarSign,
  ExternalLink,
  BarChart3,
  PieChart,
  Activity,
  CheckSquare,
  Utensils,
  Wrench,
  Calculator,
  MessageCircle,
  Heart,
  Users,
  ChevronLeft,
  ListChecks,
  Layers,
  Sunrise,
  Grid3X3,
  Circle,
  Cog,
  Gem,
  Scale,
  RotateCcw,
  Gauge,
  Repeat,
  Phoenix,
  Tornado,
  Compass
} from "lucide-react";

// -----------------------------
// Utility components
// -----------------------------
const Container = ({ className = "", children }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white/60 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
    {children}
  </span>
);

const Button = ({ as: Tag = "button", className = "", children, icon: Icon, ...props }) => (
  <Tag
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold shadow-sm transition-all hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${className}`}
    {...props}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </Tag>
);

const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ eyebrow, title, desc }) => (
  <div className="mb-8">
    {eyebrow && (
      <div className="mb-2">
        <Badge>{eyebrow}</Badge>
      </div>
    )}
    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">{title}</h2>
    {desc && <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{desc}</p>}
  </div>
);

// -----------------------------
// Data
// -----------------------------
// Plan templates and modules (MVP)
const PLAN_MODULES = [
  {
    id: 'move-out-starter',
    title: 'Move Out Starter',
    description: 'Core steps to safely move out and set up utilities',
    tags: ['moving-out', 'living'],
    categoryKey: 'living',
    guideIds: ['finding-apartment', 'utilities-setup-basics', 'renters-insurance-basics'],
    effortPoints: 6,
    minAge: 16,
  },
  {
    id: 'first-credit-card',
    title: 'First Credit Card',
    description: 'Build credit responsibly from day one',
    tags: ['credit', 'money'],
    categoryKey: 'money-finance',
    guideIds: ['credit-card-basics', 'credit-score-101'],
    effortPoints: 4,
  },
  {
    id: 'budget-and-savings',
    title: 'Budget & Savings',
    description: 'Set up a basic budget and automatic savings',
    tags: ['budget', 'savings', 'money'],
    categoryKey: 'money-finance',
    guideIds: ['budgeting-basics', 'open-savings-account'],
    effortPoints: 5,
  },
  {
    id: 'health-coverage-101',
    title: 'Health Coverage 101',
    description: 'Find a PCP and understand your plan',
    tags: ['health', 'pcp'],
    categoryKey: 'health',
    guideIds: ['find-pcp', 'health-insurance-101'],
    effortPoints: 5,
  },
  {
    id: 'first-job-ramp',
    title: 'First Job Ramp',
    description: 'Basics for resumes, interviews, and onboarding',
    tags: ['career', 'job'],
    categoryKey: 'career',
    guideIds: ['resume-basics', 'interview-basics', 'first-day-checklist'],
    effortPoints: 6,
  },
];

const PLAN_TEMPLATES = [
  {
    id: 'template-moving-out',
    name: 'Moving Out Soon',
    targetTags: ['moving-out'],
    requiredModules: ['move-out-starter', 'budget-and-savings'],
    optionalModules: ['first-credit-card', 'health-coverage-101'],
    weeklyPacing: 5,
  },
  {
    id: 'template-first-job',
    name: 'First Job',
    targetTags: ['job', 'career'],
    requiredModules: ['first-job-ramp', 'budget-and-savings'],
    optionalModules: ['first-credit-card', 'health-coverage-101'],
    weeklyPacing: 5,
  },
  {
    id: 'template-student',
    name: 'Student Foundations',
    targetTags: ['school', 'student'],
    requiredModules: ['budget-and-savings'],
    optionalModules: ['first-credit-card', 'health-coverage-101'],
    weeklyPacing: 4,
  },
];

// -----------------------------
// Plans Hook (localStorage MVP)
// -----------------------------
const PlansContext = createContext(null);

const usePlans = () => {
  const [activePlan, setActivePlan] = useState(() => {
    const raw = localStorage.getItem('growup-active-plan');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (activePlan) localStorage.setItem('growup-active-plan', JSON.stringify(activePlan));
  }, [activePlan]);

  const getProfile = () => {
    const raw = localStorage.getItem('growup-user-profile');
    return raw ? JSON.parse(raw) : null;
  };

  const findModules = (ids) => PLAN_MODULES.filter(m => ids.includes(m.id));

  const scoreTemplate = (template, profile) => {
    if (!profile) return 0;
    const tags = new Set(profile.tags || []);
    let score = 0;
    template.targetTags.forEach(t => { if (tags.has(t)) score += 2; });
    return score;
  };

  const generatePlan = (profileOverride) => {
    const profile = profileOverride || getProfile();
    const scored = PLAN_TEMPLATES
      .map(t => ({ t, score: scoreTemplate(t, profile) }))
      .sort((a, b) => b.score - a.score);
    const chosen = scored[0]?.t || PLAN_TEMPLATES[0];
    const required = findModules(chosen.requiredModules);
    const optional = findModules(chosen.optionalModules).slice(0, 2);
    const modules = [...required, ...optional];
    // naive weekly chunking by effortPoints
    const weeks = [];
    let week = { tasks: [], effort: 0 };
    modules.forEach(m => {
      week.tasks.push(...m.guideIds.map(id => ({ id: `${m.id}:${id}`, guideId: id, moduleId: m.id, completed: false })));
      week.effort += m.effortPoints;
      if (week.effort >= chosen.weeklyPacing) { weeks.push(week); week = { tasks: [], effort: 0 }; }
    });
    if (week.tasks.length) weeks.push(week);
    const plan = { templateId: chosen.id, modules: modules.map(m => m.id), weeks, startedAt: Date.now(), version: 1 };
    setActivePlan(plan);
    return plan;
  };

  const getActivePlan = () => activePlan;

  const completeTaskInPlan = (taskId) => {
    if (!activePlan) return;
    const next = { ...activePlan, weeks: activePlan.weeks.map(w => ({ ...w, tasks: w.tasks.map(t => t.id === taskId ? { ...t, completed: true } : t) })) };
    setActivePlan(next);
  };

  const toggleTaskInPlan = (taskId) => {
    if (!activePlan) return;
    const next = { ...activePlan, weeks: activePlan.weeks.map(w => ({ ...w, tasks: w.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) })) };
    setActivePlan(next);
  };

  const completeWeekInPlan = (weekIdx) => {
    if (!activePlan) return;
    const next = { ...activePlan, weeks: activePlan.weeks.map((w, i) => i !== weekIdx ? w : ({ ...w, tasks: w.tasks.map(t => ({ ...t, completed: true })) })) };
    setActivePlan(next);
  };

  // Listen for quiz completion event to auto-generate a plan
  useEffect(() => {
    const onGenerate = () => generatePlan();
    window.addEventListener('growup-generate-plan', onGenerate);
    return () => window.removeEventListener('growup-generate-plan', onGenerate);
  }, [generatePlan]);

  return { activePlan, generatePlan, getActivePlan, completeTaskInPlan, toggleTaskInPlan, completeWeekInPlan };
};

const PlansProvider = ({ children }) => {
  const value = usePlans();
  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>;
};

const usePlansContext = () => {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlansContext must be used within PlansProvider');
  return ctx;
};
const CATEGORIES = [
  {
    key: "life-skills",
    name: "Life Skills",
    desc: "Laundry, cooking basics, etiquette, household tools.",
    icon: GraduationCap,
    color: "from-sky-400 to-indigo-500",
  },
  {
    key: "money-finance",
    name: "Money & Finance",
    desc: "Budgeting, credit, banking, taxes, negotiating bills.",
    icon: Wallet,
    color: "from-emerald-400 to-teal-500",
  },
  {
    key: "health",
    name: "Health & Wellness",
    desc: "Find a PCP, schedule visits, insurance 101, prescriptions.",
    icon: Stethoscope,
    color: "from-rose-400 to-pink-500",
  },
  {
    key: "living",
    name: "Living on Your Own",
    desc: "Renting, utilities, cleaning routines, basic repairs.",
    icon: Home,
    color: "from-amber-400 to-orange-500",
  },
  {
    key: "career",
    name: "Work & Career",
    desc: "Resumes, interviews, first-day checklists, networking.",
    icon: Briefcase,
    color: "from-violet-400 to-purple-500",
  },
];

const DETAILED_GUIDES = {
  "life-skills": [
    {
      title: "Laundry 101: From Sorting to Folding",
      summary: "Complete guide to washing clothes without shrinking or ruining them.",
      difficulty: "Beginner",
      duration: "15 min",
      description: "Master the art of laundry with this comprehensive guide. Learn to sort clothes properly, choose the right settings, and keep your clothes looking new for years.",
      steps: [
        "Set up your laundry area with proper lighting and sorting bins",
        "Sort clothes by color: whites, lights, darks, and delicates",
        "Check all pockets for items (coins, tissues, receipts, etc.)",
        "Read care labels and separate by fabric type and washing instructions",
        "Pre-treat any stains with appropriate stain remover (let sit 5-10 minutes)",
        "Load washing machine without overpacking (clothes should move freely)",
        "Measure detergent according to load size and soil level",
        "Select water temperature: hot for whites, warm for colors, cold for delicates",
        "Choose appropriate cycle: normal for everyday items, delicate for fragile fabrics",
        "Start the wash and set a timer to move clothes promptly when done",
        "Transfer clothes to dryer immediately or hang to air dry",
        "Clean lint filter before each dryer load",
        "Select appropriate heat setting: high for cottons, medium for synthetics, low for delicates",
        "Remove clothes promptly when dry to prevent wrinkles",
        "Fold or hang clothes immediately while still warm"
      ],
      tasks: [
        { 
          id: "laundry-1", 
          text: "Set up designated laundry sorting area with 3-4 bins", 
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Easy",
          cost: "$30-50",
          microActions: [
            {
              text: "Choose a location near your laundry area or bedroom closet",
              time: "5 mins",
              resources: ["https://www.pinterest.com/search/pins/?q=laundry%20room%20organization", "https://www.houzz.com/photos/laundry-room"]
            },
            {
              text: "Buy 3-4 laundry baskets or bins (whites, darks, lights, delicates)",
              time: "20 mins",
              resources: ["https://www.target.com/c/laundry-baskets", "https://www.amazon.com/s?k=laundry+sorting+bins", "https://www.walmart.com/browse/home/laundry-baskets"]
            },
            {
              text: "Label each bin clearly with masking tape or labels",
              time: "10 mins",
              resources: ["https://www.amazon.com/s?k=label+maker", "https://www.staples.com/labels", "https://www.pinterest.com/search/pins/?q=laundry%20bin%20labels"]
            },
            {
              text: "Position bins in an easily accessible spot",
              time: "5 mins",
              resources: ["https://www.youtube.com/results?search_query=laundry+room+organization+tips"]
            },
            {
              text: "Test the system for one week and adjust placement as needed",
              time: "5 mins",
              resources: ["https://www.google.com/calendar", "https://todoist.com"]
            }
          ]
        },
        { 
          id: "laundry-2", 
          text: "Create a stain treatment kit with common removers", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Easy",
          cost: "$25-40",
          microActions: [
            {
              text: "Go to grocery store or order online: OxiClean, Shout, Dawn dish soap",
              time: "15 mins",
              resources: ["https://www.amazon.com/s?k=stain+remover+kit", "https://www.target.com/c/laundry-stain-removers", "https://www.walmart.com/browse/household-essentials/laundry-stain-removers"]
            },
            {
              text: "Buy a small container or basket to store supplies",
              time: "5 mins",
              resources: ["https://www.containerstore.com/s/storage/small-bins-baskets", "https://www.amazon.com/s?k=small+storage+basket"]
            },
            {
              text: "Add old toothbrush for scrubbing stains",
              time: "2 mins",
              resources: ["https://www.amazon.com/s?k=cleaning+toothbrush", "https://www.dollartree.com"]
            },
            {
              text: "Include white cloth rags or paper towels",
              time: "3 mins",
              resources: ["https://www.amazon.com/s?k=cleaning+rags", "https://www.target.com/c/paper-towels"]
            },
            {
              text: "Store kit in laundry area or easily accessible closet",
              time: "2 mins",
              resources: ["https://www.pinterest.com/search/pins/?q=laundry+room+storage+ideas"]
            },
            {
              text: "Test each product on an old garment first",
              time: "3 mins",
              resources: ["https://www.youtube.com/results?search_query=how+to+test+stain+remover", "https://www.goodhousekeeping.com/home/cleaning/tips/a24885/stain-removal-guide/"]
            }
          ]
        },
        { 
          id: "laundry-3", 
          text: "Practice sorting one load of mixed laundry correctly", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Gather a week's worth of dirty clothes",
              time: "3 mins",
              resources: ["https://www.youtube.com/results?search_query=how+to+sort+laundry"]
            },
            {
              text: "Read care labels on each item (look for washing symbols)",
              time: "5 mins",
              resources: ["https://www.cleanipedia.com/us/laundry/laundry-symbols-guide", "https://www.whirlpool.com/blog/washers-and-dryers/laundry-symbols.html"]
            },
            {
              text: "Sort whites (white shirts, underwear, socks) into one pile",
              time: "3 mins",
              resources: ["https://www.tide.com/en-us/how-to-wash-clothes/how-to-separate-laundry"]
            },
            {
              text: "Sort darks (jeans, dark shirts, black items) into another pile",
              time: "3 mins",
              resources: ["https://www.maytag.com/blog/washers-and-dryers/how-to-sort-laundry.html"]
            },
            {
              text: "Sort lights/colors (pastels, colored shirts) into third pile",
              time: "3 mins",
              resources: ["https://www.goodhousekeeping.com/home/cleaning/tips/a24782/sort-laundry/"]
            },
            {
              text: "Set aside delicates (bras, silk, lace) separately",
              time: "2 mins",
              resources: ["https://www.wikihow.com/Wash-Delicate-Clothes", "https://www.woolite.com/how-to-wash-delicates/"]
            },
            {
              text: "Check all pockets for items before sorting",
              time: "1 min",
              resources: ["https://www.realsimple.com/home-organizing/cleaning/laundry/things-to-check-before-washing-clothes"]
            }
          ]
        },
        { 
          id: "laundry-4", 
          text: "Successfully wash a load of whites without damage", 
          completed: false,
          timeEstimate: "15 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Load only white items into washing machine",
              time: "3 mins",
              resources: ["https://www.youtube.com/results?search_query=how+to+load+washing+machine"]
            },
            {
              text: "Use hot water setting for whites",
              time: "1 min",
              resources: ["https://www.tide.com/en-us/how-to-wash-clothes/how-to-wash-white-clothes"]
            },
            {
              text: "Add appropriate amount of detergent (check cup measurements)",
              time: "2 mins",
              resources: ["https://www.consumerreports.org/laundry/how-much-laundry-detergent-to-use/"]
            },
            {
              text: "Select normal/cotton cycle for durability",
              time: "1 min",
              resources: ["https://www.whirlpool.com/blog/washers-and-dryers/washing-machine-cycles.html"]
            },
            {
              text: "Start machine and set timer for cycle completion",
              time: "2 mins",
              resources: ["https://www.google.com/search?q=phone+timer"]
            },
            {
              text: "Move to dryer immediately when done to prevent mildew",
              time: "3 mins",
              resources: ["https://www.goodhousekeeping.com/home/cleaning/tips/a24885/prevent-mildew-in-washing-machine/"]
            },
            {
              text: "Use medium-high heat for white cotton items",
              time: "3 mins",
              resources: ["https://www.maytag.com/blog/washers-and-dryers/dryer-heat-settings.html"]
            }
          ]
        },
        { 
          id: "laundry-5", 
          text: "Successfully wash a load of colored clothes", 
          completed: false,
          timeEstimate: "15 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Load only similar colored items together",
              time: "3 mins",
              resources: ["https://www.tide.com/en-us/how-to-wash-clothes/how-to-separate-laundry"]
            },
            {
              text: "Use cold water to prevent colors from bleeding",
              time: "1 min",
              resources: ["https://www.consumerreports.org/laundry/cold-water-washing/"]
            },
            {
              text: "Add color-safe detergent or regular detergent",
              time: "2 mins",
              resources: ["https://www.tide.com/en-us/shop/type/liquid-laundry-detergent/tide-coldwater-clean"]
            },
            {
              text: "Select normal cycle unless items are very delicate",
              time: "1 min",
              resources: ["https://www.whirlpool.com/blog/washers-and-dryers/washing-machine-cycles.html"]
            },
            {
              text: "Start machine and note cycle time",
              time: "2 mins",
              resources: ["https://www.google.com/search?q=phone+timer"]
            },
            {
              text: "Transfer to dryer promptly when cycle ends",
              time: "3 mins",
              resources: ["https://www.goodhousekeeping.com/home/cleaning/tips/a24885/prevent-mildew-in-washing-machine/"]
            },
            {
              text: "Use medium heat setting for colored items",
              time: "3 mins",
              resources: ["https://www.maytag.com/blog/washers-and-dryers/dryer-heat-settings.html"]
            }
          ]
        },
        { 
          id: "laundry-6", 
          text: "Air dry delicate items properly on drying rack", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Easy",
          cost: "$15-30 for drying rack",
          microActions: [
            {
              text: "Purchase a folding drying rack or use hangers",
              time: "5 mins",
              resources: ["https://www.amazon.com/s?k=folding+drying+rack", "https://www.target.com/c/laundry-drying-racks"]
            },
            {
              text: "Identify delicate items: silk, lace, bras, sweaters",
              time: "2 mins",
              resources: ["https://www.wikihow.com/Wash-Delicate-Clothes"]
            },
            {
              text: "Gently squeeze out excess water (don't wring)",
              time: "3 mins",
              resources: ["https://www.goodhousekeeping.com/home/cleaning/tips/a24782/delicate-clothes-washing/"]
            },
            {
              text: "Lay flat items like sweaters on rack surface",
              time: "3 mins",
              resources: ["https://www.realsimple.com/home-organizing/cleaning/laundry/how-to-dry-sweaters"]
            },
            {
              text: "Hang items like blouses on padded hangers",
              time: "3 mins",
              resources: ["https://www.amazon.com/s?k=padded+hangers"]
            },
            {
              text: "Place rack in well-ventilated area away from direct sunlight",
              time: "2 mins",
              resources: ["https://www.thespruce.com/air-drying-laundry-indoors-2146674"]
            },
            {
              text: "Allow 12-24 hours for complete drying",
              time: "2 mins",
              resources: ["https://www.goodhousekeeping.com/home/cleaning/tips/a24782/delicate-clothes-washing/"]
            }
          ]
        },
        { 
          id: "laundry-7", 
          text: "Master the folding technique for t-shirts and pants", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Watch YouTube videos: 'KonMari method folding' or 'retail folding techniques'",
              time: "10 mins",
              resources: ["https://www.youtube.com/results?search_query=konmari+folding+method", "https://www.youtube.com/results?search_query=how+to+fold+clothes+fast"]
            },
            {
              text: "Practice t-shirt folding: lay flat, fold sides in, fold bottom up",
              time: "8 mins",
              resources: ["https://www.realsimple.com/home-organizing/organizing/organizing-clothes/how-to-fold-t-shirts"]
            },
            {
              text: "Practice pants folding: match inseams, fold in half length-wise, fold again",
              time: "5 mins",
              resources: ["https://www.goodhousekeeping.com/home/organizing/tips/a24885/how-to-fold-pants/"]
            },
            {
              text: "Time yourself folding 10 items to build speed",
              time: "3 mins",
              resources: ["https://www.google.com/search?q=phone+stopwatch"]
            },
            {
              text: "Create uniform stacks that fit in your dresser",
              time: "2 mins",
              resources: ["https://www.thespruce.com/organize-dresser-drawers-1900460"]
            },
            {
              text: "Practice until you can fold without thinking about it",
              time: "2 mins",
              resources: ["https://www.apartmenttherapy.com/how-to-fold-clothes-like-marie-kondo-36684155"]
            }
          ]
        },
        { 
          id: "laundry-8", 
          text: "Complete an entire laundry cycle from dirty to folded", 
          completed: false,
          timeEstimate: "2 hours",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Collect one full load of dirty laundry",
              time: "5 mins",
              resources: ["https://www.tide.com/en-us/how-to-wash-clothes/how-to-separate-laundry"]
            },
            {
              text: "Sort items appropriately by color and fabric type",
              time: "10 mins",
              resources: ["https://www.goodhousekeeping.com/home/cleaning/tips/a24782/sort-laundry/"]
            },
            {
              text: "Pre-treat any visible stains with your stain kit",
              time: "5 mins",
              resources: ["https://www.goodhousekeeping.com/home/cleaning/tips/a24885/stain-removal-guide/"]
            },
            {
              text: "Wash using correct water temperature and cycle",
              time: "45 mins",
              resources: ["https://www.whirlpool.com/blog/washers-and-dryers/washing-machine-cycles.html"]
            },
            {
              text: "Transfer promptly to dryer or air-dry as appropriate",
              time: "5 mins",
              resources: ["https://www.maytag.com/blog/washers-and-dryers/dryer-heat-settings.html"]
            },
            {
              text: "Remove from dryer while slightly warm to prevent wrinkles",
              time: "5 mins",
              resources: ["https://www.realsimple.com/home-organizing/cleaning/laundry/prevent-wrinkles"]
            },
            {
              text: "Fold or hang all items immediately",
              time: "15 mins",
              resources: ["https://www.apartmenttherapy.com/how-to-fold-clothes-like-marie-kondo-36684155"]
            },
            {
              text: "Put away in dresser or closet within 30 minutes",
              time: "10 mins",
              resources: ["https://www.thespruce.com/organize-dresser-drawers-1900460"]
            }
          ]
        }
      ],
      tips: [
        "Wash clothes inside out to preserve colors and reduce pilling",
        "Use cold water for most loads to save energy and prevent shrinking",
        "Don't overload machines - clothes need room to move for proper cleaning",
        "Remove clothes from dryer while slightly damp to prevent over-drying",
        "Invest in good hangers and fold clothes the same way stores do"
      ],
      icon: GraduationCap,
    },
    {
      title: "Basic Cooking Skills Everyone Should Know",
      summary: "Essential techniques like boiling pasta, making eggs, and kitchen safety.",
      difficulty: "Beginner", 
      duration: "20 min",
      description: "Build confidence in the kitchen with fundamental cooking skills. Learn knife safety, basic techniques, and how to prepare simple, nutritious meals.",
      steps: [
        "Set up a clean workspace with cutting board, sharp knife, and towels",
        "Learn proper knife grip: pinch the blade, wrap fingers around handle",
        "Practice basic cuts: dice, chop, slice, and julienne",
        "Master boiling water: use large pot, add salt, bring to rolling boil",
        "Cook perfect pasta: use plenty of water, stir occasionally, test for doneness",
        "Scramble eggs: low heat, constant stirring, remove from heat while slightly wet",
        "Sauté vegetables: medium-high heat, don't overcrowd pan, season properly",
        "Season food gradually: taste as you go, add salt at the end",
        "Learn food safety: proper hand washing, avoiding cross-contamination",
        "Clean as you cook: wash dishes, wipe surfaces, put ingredients away"
      ],
      tasks: [
        { 
          id: "cooking-1", 
          text: "Organize kitchen tools and identify what you're missing", 
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Easy",
          cost: "$50-100 for missing tools",
          microActions: [
            {
              text: "Check your kitchen for: sharp knife, cutting board, can opener, measuring cups",
              time: "10 mins",
              resources: ["https://www.goodhousekeeping.com/home/g26212048/essential-kitchen-tools/"]
            },
            {
              text: "Look for: mixing bowls, wooden spoon, spatula, whisk, tongs",
              time: "10 mins",
              resources: ["https://www.seriouseats.com/essential-kitchen-equipment"]
            },
            {
              text: "Identify missing items and create shopping list",
              time: "5 mins",
              resources: ["https://sheets.google.com", "https://www.anylist.com"]
            },
            {
              text: "Visit Target, Walmart, or order on Amazon for basic kitchen starter set",
              time: "15 mins",
              resources: ["https://www.target.com/c/kitchen-dining", "https://www.amazon.com/s?k=kitchen+starter+set", "https://www.walmart.com/browse/home/kitchen-dining"]
            },
            {
              text: "Organize tools in easy-to-reach drawers or containers",
              time: "3 mins",
              resources: ["https://www.containerstore.com/kitchen-organization", "https://www.ikea.com/us/en/cat/kitchen-organization-24264/"]
            },
            {
              text: "Test each tool to make sure it works properly",
              time: "2 mins",
              resources: ["https://www.youtube.com/results?search_query=how+to+test+kitchen+tools"]
            }
          ]
        },
        { 
          id: "cooking-2", 
          text: "Practice knife skills by dicing an onion safely", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Medium",
          cost: "$2-3 for onions",
          microActions: [
            {
              text: "Watch YouTube video: 'How to dice an onion properly'",
              time: "10 mins",
              resources: ["https://www.youtube.com/results?search_query=how+to+dice+onion+properly", "https://www.youtube.com/results?search_query=knife+skills+basics"]
            },
            {
              text: "Buy a medium yellow onion from grocery store",
              time: "5 mins",
              resources: ["https://www.instacart.com", "https://www.kroger.com", "https://www.walmart.com/grocery"]
            },
            {
              text: "Practice proper knife grip: pinch blade with thumb and forefinger",
              time: "3 mins",
              resources: ["https://www.seriouseats.com/knife-skills-how-to-hold-a-knife"]
            },
            {
              text: "Cut onion in half from root to stem, peel outer layer",
              time: "3 mins",
              resources: ["https://www.foodnetwork.com/how-to/articles/how-to-cut-an-onion"]
            },
            {
              text: "Make horizontal cuts, then vertical cuts, then dice across",
              time: "5 mins",
              resources: ["https://www.bonappetit.com/test-kitchen/how-to/article/how-to-dice-an-onion"]
            },
            {
              text: "Practice 3-4 times until comfortable and consistent",
              time: "2 mins",
              resources: ["https://www.culinaryschools.org/yummy/knife-skills/"]
            },
            {
              text: "Clean up immediately and wash knife properly",
              time: "2 mins",
              resources: ["https://www.thekitchn.com/how-to-wash-kitchen-knives-cleaning-lessons-from-the-kitchn-216134"]
            }
          ]
        },
        { 
          id: "cooking-3", 
          text: "Successfully boil pasta until perfectly al dente", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Easy",
          cost: "$3-5 for pasta and salt",
          microActions: [
            {
              text: "Buy box of pasta (penne or spaghetti) and salt",
              time: "5 mins",
              resources: ["https://www.instacart.com", "https://www.amazon.com/s?k=pasta", "https://www.target.com/c/pasta"]
            },
            {
              text: "Fill large pot with water (about 4 quarts for 1 lb pasta)",
              time: "3 mins",
              resources: ["https://www.bonappetit.com/test-kitchen/how-to/article/how-to-cook-pasta"]
            },
            {
              text: "Add 1 tablespoon salt and bring to rolling boil",
              time: "10 mins",
              resources: ["https://www.seriouseats.com/how-to-cook-pasta-salt-water-boiling"]
            },
            {
              text: "Add pasta and stir immediately to prevent sticking",
              time: "2 mins",
              resources: ["https://www.foodnetwork.com/how-to/articles/how-to-boil-pasta"]
            },
            {
              text: "Set timer for package time minus 1 minute",
              time: "1 min",
              resources: ["https://www.google.com/search?q=phone+timer"]
            },
            {
              text: "Test pasta by biting - should be firm but not crunchy",
              time: "2 mins",
              resources: ["https://www.thekitchn.com/whats-the-difference-between-al-dente-and-fully-cooked-pasta-256430"]
            },
            {
              text: "Drain immediately when done (save 1 cup pasta water)",
              time: "2 mins",
              resources: ["https://www.epicurious.com/expert-advice/why-save-pasta-water-article"]
            }
          ]
        },
        { 
          id: "cooking-4", 
          text: "Make fluffy scrambled eggs without browning", 
          completed: false,
          timeEstimate: "15 mins",
          difficulty: "Easy",
          cost: "$5-8 for eggs, butter, milk",
          microActions: [
            {
              text: "Buy fresh eggs, butter, and milk from grocery store",
              time: "3 mins",
              resources: ["https://www.instacart.com", "https://www.kroger.com", "https://www.walmart.com/grocery"]
            },
            {
              text: "Crack 2-3 eggs into bowl, add 1 tablespoon milk",
              time: "2 mins",
              resources: ["https://www.youtube.com/results?search_query=how+to+crack+eggs+properly"]
            },
            {
              text: "Whisk eggs thoroughly until completely combined",
              time: "2 mins",
              resources: ["https://www.foodnetwork.com/recipes/alton-brown/perfect-scrambled-eggs-recipe-1937667"]
            },
            {
              text: "Heat non-stick pan on low-medium heat",
              time: "2 mins",
              resources: ["https://www.seriouseats.com/perfect-scrambled-eggs-recipe"]
            },
            {
              text: "Add small amount of butter, let it melt",
              time: "1 min",
              resources: ["https://www.bonappetit.com/recipe/perfect-scrambled-eggs"]
            },
            {
              text: "Pour in eggs, stir constantly with spatula",
              time: "3 mins",
              resources: ["https://www.youtube.com/results?search_query=gordon+ramsay+scrambled+eggs"]
            },
            {
              text: "Remove from heat while slightly wet (they'll finish cooking)",
              time: "2 mins",
              resources: ["https://www.epicurious.com/expert-advice/how-to-make-perfect-scrambled-eggs-article"]
            }
          ]
        },
        { 
          id: "cooking-5", 
          text: "Sauté vegetables without burning or undercooking", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Medium",
          cost: "$8-12 for vegetables and oil",
          microActions: [
            {
              text: "Buy bell peppers, onions, and zucchini for practice",
              time: "5 mins",
              resources: ["https://www.instacart.com", "https://www.kroger.com", "https://www.freshmarket.com"]
            },
            {
              text: "Cut vegetables into uniform pieces (about 1/2 inch)",
              time: "8 mins",
              resources: ["https://www.youtube.com/results?search_query=how+to+cut+vegetables+evenly"]
            },
            {
              text: "Heat pan to medium-high, add 1-2 tablespoons oil",
              time: "2 mins",
              resources: ["https://www.seriouseats.com/how-to-saute-vegetables"]
            },
            {
              text: "Add vegetables that take longest first (onions, peppers)",
              time: "3 mins",
              resources: ["https://www.thekitchn.com/how-to-saute-any-vegetable-cooking-lessons-from-the-kitchn-113463"]
            },
            {
              text: "Stir frequently but don't move too much",
              time: "5 mins",
              resources: ["https://www.bonappetit.com/test-kitchen/how-to/article/how-to-saute"]
            },
            {
              text: "Add quick-cooking vegetables (zucchini) last",
              time: "1 min",
              resources: ["https://www.foodnetwork.com/how-to/articles/how-to-saute-vegetables"]
            },
            {
              text: "Season with salt and pepper, taste for doneness",
              time: "1 min",
              resources: ["https://www.epicurious.com/expert-advice/how-to-season-food-properly-article"]
            }
          ]
        },
        { 
          id: "cooking-6", 
          text: "Prepare a complete simple meal (pasta + vegetables + protein)", 
          completed: false,
          timeEstimate: "1 hour",
          difficulty: "Medium",
          cost: "$15-20 for full meal",
          microActions: [
            {
              text: "Plan menu: pasta with sautéed vegetables and grilled chicken",
              time: "5 mins",
              resources: ["https://www.allrecipes.com/recipe/213742/chicken-and-vegetable-pasta/", "https://www.foodnetwork.com/recipes/pasta-with-chicken-and-vegetables"]
            },
            {
              text: "Make grocery list and shop for all ingredients",
              time: "15 mins",
              resources: ["https://www.anylist.com", "https://www.instacart.com", "https://sheets.google.com"]
            },
            {
              text: "Start by seasoning and cooking chicken breast in pan",
              time: "15 mins",
              resources: ["https://www.youtube.com/results?search_query=how+to+cook+chicken+breast+perfectly"]
            },
            {
              text: "While chicken cooks, start boiling water for pasta",
              time: "5 mins",
              resources: ["https://www.bonappetit.com/test-kitchen/how-to/article/how-to-cook-pasta"]
            },
            {
              text: "Sauté vegetables in separate pan",
              time: "10 mins",
              resources: ["https://www.seriouseats.com/how-to-saute-vegetables"]
            },
            {
              text: "Cook pasta according to previous task instructions",
              time: "8 mins",
              resources: ["https://www.foodnetwork.com/how-to/articles/how-to-boil-pasta"]
            },
            {
              text: "Combine all components and serve hot",
              time: "2 mins",
              resources: ["https://www.epicurious.com/expert-advice/how-to-plate-food-like-a-chef-article"]
            }
          ]
        },
        { 
          id: "cooking-7", 
          text: "Follow a new recipe successfully from start to finish", 
          completed: false,
          timeEstimate: "1.5 hours",
          difficulty: "Medium",
          cost: "$10-15 for ingredients",
          microActions: [
            {
              text: "Find simple recipe online (AllRecipes.com or Food Network)",
              time: "10 mins",
              resources: ["https://www.allrecipes.com/recipes/17562/30-minute-meals/", "https://www.foodnetwork.com/recipes", "https://www.budgetbytes.com"]
            },
            {
              text: "Choose recipe with 5-8 ingredients and 30 minutes or less",
              time: "5 mins",
              resources: ["https://www.tasteofhome.com/collection/30-minute-dinners/", "https://www.eatingwell.com/recipes/22189/quick-easy/"]
            },
            {
              text: "Read entire recipe twice before starting",
              time: "5 mins",
              resources: ["https://www.seriouseats.com/how-to-read-a-recipe"]
            },
            {
              text: "Shop for all ingredients and check you have necessary tools",
              time: "20 mins",
              resources: ["https://www.instacart.com", "https://www.anylist.com"]
            },
            {
              text: "Prep all ingredients before you start cooking (mise en place)",
              time: "15 mins",
              resources: ["https://www.bonappetit.com/story/mise-en-place-cooking-tips"]
            },
            {
              text: "Follow recipe step-by-step without deviating",
              time: "30 mins",
              resources: ["https://www.thekitchn.com/how-to-follow-a-recipe-and-get-great-results-every-time-cooking-lessons-from-the-kitchn-200560"]
            },
            {
              text: "Take photo of final result and note what you learned",
              time: "5 mins",
              resources: ["https://www.foodnetwork.com/how-to/packages/food-network-essentials/food-photography-tips"]
            }
          ]
        },
        { 
          id: "cooking-8", 
          text: "Cook for someone else and receive positive feedback", 
          completed: false,
          timeEstimate: "2 hours",
          difficulty: "Medium",
          cost: "$20-30 for meal ingredients",
          microActions: [
            {
              text: "Choose a recipe you've successfully made before",
              time: "5 mins",
              resources: ["https://www.allrecipes.com/recipes/17562/30-minute-meals/", "https://www.foodnetwork.com/recipes"]
            },
            {
              text: "Invite friend, family member, or roommate to dinner",
              time: "10 mins",
              resources: ["https://www.evite.com", "https://calendar.google.com"]
            },
            {
              text: "Plan timing so food is ready when guest arrives",
              time: "5 mins",
              resources: ["https://www.thekitchn.com/how-to-time-a-meal-so-everything-comes-together-cooking-lessons-from-the-kitchn-174453"]
            },
            {
              text: "Set table nicely and create welcoming atmosphere",
              time: "15 mins",
              resources: ["https://www.realsimple.com/home-organizing/decorating/table-setting-guide", "https://www.pinterest.com/search/pins/?q=simple+table+setting"]
            },
            {
              text: "Cook with confidence and enjoy the process",
              time: "60 mins",
              resources: ["https://www.bonappetit.com/story/mise-en-place-cooking-tips"]
            },
            {
              text: "Ask for honest feedback about taste and presentation",
              time: "20 mins",
              resources: ["https://www.epicurious.com/expert-advice/how-to-give-and-receive-feedback-on-cooking-article"]
            },
            {
              text: "Take note of suggestions for improvement",
              time: "5 mins",
              resources: ["https://www.evernote.com", "https://sheets.google.com"]
            }
          ]
        }
      ],
      tips: [
        "Keep knives sharp - dull knives are more dangerous than sharp ones",
        "Taste your food throughout cooking, not just at the end",
        "Prep all ingredients before you start cooking (mise en place)",
        "Don't move food around too much - let it develop flavor and color",
        "Start with simple recipes and gradually try more complex dishes"
      ],
      icon: GraduationCap,
    },
    {
      title: "Professional Email Etiquette",
      summary: "Write emails that get responses and build your professional reputation.",
      difficulty: "Beginner",
      duration: "10 min", 
      description: "Master professional email communication to advance your career. Learn to write clear, concise emails that get results and leave a positive impression.",
      steps: [
        "Choose a professional email address (firstname.lastname@domain.com)",
        "Write clear, specific subject lines that summarize the email's purpose",
        "Use appropriate greetings: 'Dear Mr./Ms. [Name]' for formal, 'Hi [Name]' for casual",
        "Structure emails with clear paragraphs: purpose, details, action needed",
        "Keep emails concise: one screen length maximum when possible",
        "Use bullet points for multiple items or requests",
        "Proofread for spelling, grammar, and tone before sending",
        "Choose appropriate sign-offs: 'Best regards' (formal), 'Best' (semi-formal), 'Thanks' (casual)",
        "Include your full name and contact information in signature",
        "Respond to emails within 24-48 hours, even if just to acknowledge receipt"
      ],
      tasks: [
        { 
          id: "email-1", 
          text: "Create a professional email address if you don't have one", 
          completed: false,
          microActions: [
            "Go to Gmail.com, Outlook.com, or Yahoo.com",
            "Choose format: firstname.lastname@gmail.com or firstinitiallastname@gmail.com",
            "Avoid numbers, nicknames, or unprofessional words",
            "Check availability and create variations if needed",
            "Set up strong password and enable two-factor authentication",
            "Update this email on your resume and LinkedIn profile"
          ]
        },
        { 
          id: "email-2", 
          text: "Set up a professional email signature with contact info", 
          completed: false,
          microActions: [
            "Open email settings in Gmail (Settings > General > Signature)",
            "Include: Full name, phone number, professional email",
            "Add LinkedIn profile URL if you have one",
            "Keep formatting simple - avoid fancy fonts or colors",
            "Test signature by sending email to yourself",
            "Make sure it displays correctly on mobile devices"
          ]
        },
        { 
          id: "email-3", 
          text: "Write and send a professional introduction email", 
          completed: false,
          microActions: [
            "Choose recipient: potential mentor, industry contact, or alumnus",
            "Subject line: 'Introduction - [Your Name] - [Brief Context]'",
            "Start with: 'Dear Mr./Ms. [Last Name]'",
            "Introduce yourself in 2-3 sentences with relevant background",
            "State your purpose clearly and make specific request",
            "End with professional closing and your full name",
            "Proofread twice before sending"
          ]
        },
        { 
          id: "email-4", 
          text: "Send a follow-up email after meeting someone new", 
          completed: false,
          microActions: [
            "Send within 24-48 hours of meeting",
            "Subject: 'Great meeting you at [event/location]'",
            "Remind them where you met and context of conversation",
            "Reference something specific you discussed",
            "Suggest next step: coffee meeting, phone call, or connection",
            "Attach your business card photo or LinkedIn if mentioned",
            "Keep it brief - 3-4 sentences maximum"
          ]
        },
        { 
          id: "email-5", 
          text: "Write a clear, concise request email and get a positive response", 
          completed: false,
          microActions: [
            "Choose a reasonable request: information, brief meeting, or small favor",
            "Use clear subject line that states your request",
            "Get to the point quickly - state request in first paragraph",
            "Explain why you're asking them specifically",
            "Be specific about what you need and timeline",
            "Make it easy for them to say yes",
            "Follow up politely if no response after one week"
          ]
        },
        { 
          id: "email-6", 
          text: "Send a thank you email after an interview or meeting", 
          completed: false,
          microActions: [
            "Send within 24 hours of interview/meeting",
            "Subject: 'Thank you - [Position] interview' or 'Thank you for your time'",
            "Thank them for their time and insights",
            "Mention specific topic you discussed",
            "Reiterate your interest and qualifications",
            "Include any additional information you promised",
            "Close professionally and wait for their response"
          ]
        },
        { 
          id: "email-7", 
          text: "Practice different email tones for different situations", 
          completed: false,
          microActions: [
            "Write formal email to unknown professional contact",
            "Write semi-formal email to known colleague or supervisor",
            "Write casual but professional email to peer or teammate",
            "Practice apology email for a mistake",
            "Write urgent but polite email for time-sensitive request",
            "Get feedback from mentor or friend on tone differences",
            "Save examples as templates for future use"
          ]
        },
        { 
          id: "email-8", 
          text: "Get feedback on your email style from a mentor or colleague", 
          completed: false,
          microActions: [
            "Find mentor, supervisor, or professional friend willing to help",
            "Send them 2-3 different email examples you've written",
            "Ask for specific feedback on tone, clarity, and professionalism",
            "Request suggestions for improvement",
            "Practice rewriting emails based on their feedback",
            "Follow up with improved versions for additional input",
            "Apply lessons learned to future professional emails"
          ]
        }
      ],
      tips: [
        "When in doubt, err on the side of being more formal",
        "Use the 24-hour rule for emotional emails - draft it, then review tomorrow",
        "CC sparingly - only include people who truly need the information",
        "Use BCC for group emails to protect privacy",
        "Keep your inbox organized with folders and regular cleanup"
      ],
      icon: Mail,
    },
    {
      title: "Basic Home Tools Every Adult Needs",
      summary: "Essential tools for simple fixes and what to do when something breaks.",
      difficulty: "Beginner",
      duration: "15 min",
      description: "Build a basic toolkit and learn essential home maintenance skills. Know when to DIY and when to call professionals.",
      steps: [
        "Invest in a quality hammer (16 oz claw hammer is most versatile)",
        "Get a set of screwdrivers: flathead and Phillips in various sizes",
        "Buy an adjustable wrench and basic socket set",
        "Purchase a cordless drill with basic drill bits and screw bits",
        "Get a level, measuring tape, and utility knife",
        "Stock up on basic supplies: screws, nails, wall anchors, electrical tape",
        "Learn to locate your home's main water shut-off valve",
        "Find your electrical panel and learn to reset circuit breakers",
        "Know how to turn off gas supply to appliances",
        "Create a list of reliable local contractors for major repairs"
      ],
      tasks: [
        { 
          id: "tools-1", 
          text: "Purchase or borrow basic toolkit essentials", 
          completed: false,
          microActions: [
            "Visit Home Depot, Lowe's, or order basic tool kit on Amazon",
            "Buy: 16oz claw hammer, multi-bit screwdriver set, adjustable wrench",
            "Get: level, measuring tape, utility knife, cordless drill if budget allows",
            "Purchase: wall anchors, screws, nails, electrical tape",
            "Find small toolbox or bag to keep everything organized",
            "Test each tool and read any instruction manuals"
          ]
        },
        { 
          id: "tools-2", 
          text: "Locate and test main water shut-off valve", 
          completed: false,
          microActions: [
            "Look for water meter near street or main water line into house",
            "Check basement, utility room, or outside wall for main valve",
            "Valve usually located where main pipe enters building",
            "Take photo of valve location for future reference",
            "Test turning valve clockwise (righty-tighty) to shut off",
            "Turn back on immediately and check for leaks",
            "Label valve clearly and inform household members"
          ]
        },
        { 
          id: "tools-3", 
          text: "Find electrical panel and identify circuit breakers", 
          completed: false,
          microActions: [
            "Locate electrical panel (usually in basement, garage, or utility room)",
            "Open panel door and examine layout of circuit breakers",
            "Look for labels on each breaker (kitchen, bedroom, etc.)",
            "Test one breaker by turning off and checking what loses power",
            "Create or update circuit map if labels are missing",
            "Find main breaker that controls entire house",
            "Keep flashlight near panel for emergency use"
          ]
        },
        { 
          id: "tools-4", 
          text: "Successfully hang a picture or mirror using appropriate anchors", 
          completed: false,
          microActions: [
            "Choose lightweight picture for first attempt",
            "Use stud finder to locate wall studs for heavy items",
            "For drywall: buy appropriate anchors (toggle bolts for heavy items)",
            "Mark desired height and use level to ensure it's straight",
            "Drill pilot hole if needed, insert anchor, drive screw",
            "Hang picture and test that it's secure",
            "Step back and adjust height or position as needed"
          ]
        },
        { 
          id: "tools-5", 
          text: "Fix a loose screw or tighten a wobbly table leg", 
          completed: false,
          microActions: [
            "Identify loose screw on furniture, cabinet, or fixture",
            "Choose correct screwdriver size (Phillips or flathead)",
            "Turn screw clockwise to tighten (righty-tighty)",
            "If screw won't tighten: remove, add toothpick pieces to hole",
            "Reinsert screw and tighten again",
            "Test furniture stability by gently shaking",
            "Apply same process to other loose screws found"
          ]
        },
        { 
          id: "tools-6", 
          text: "Replace a burned-out light bulb safely", 
          completed: false,
          microActions: [
            "Turn off light switch and let bulb cool if recently used",
            "Check bulb type and wattage on old bulb before removing",
            "Buy replacement bulb of same type and wattage",
            "Use stable ladder or step stool if needed",
            "Turn old bulb counter-clockwise to remove",
            "Install new bulb by turning clockwise until snug (don't overtighten)",
            "Turn on switch to test - if it doesn't work, check connection"
          ]
        },
        { 
          id: "tools-7", 
          text: "Create emergency contact list for utilities and contractors", 
          completed: false,
          microActions: [
            "Find contact info for: electric company, gas company, water utility",
            "Look up: internet provider, landlord/property manager, local plumber",
            "Research: electrician, HVAC repair, general handyman in area",
            "Check reviews on Google, Yelp, or Nextdoor app",
            "Save all numbers in phone with clear labels",
            "Print list and post in visible location (fridge, bulletin board)",
            "Include non-emergency and emergency numbers for each"
          ]
        },
        { 
          id: "tools-8", 
          text: "Complete a small DIY project successfully", 
          completed: false,
          microActions: [
            "Choose simple project: install command hooks, assemble furniture, caulk gap",
            "Watch YouTube tutorial for your specific project",
            "Gather all necessary tools and materials before starting",
            "Read instructions completely if assembling something",
            "Work slowly and double-check measurements",
            "Take photos of before and after for reference",
            "Clean up workspace and properly store tools when finished"
          ]
        }
      ],
      tips: [
        "Quality tools last longer and work better - don't buy the cheapest option",
        "Watch YouTube tutorials before attempting any DIY project",
        "When in doubt, call a professional - some mistakes are expensive to fix",
        "Keep tools organized and clean for safety and longevity",
        "Start with small projects to build confidence before tackling bigger ones"
      ],
      icon: Home,
    },
    {
      title: "Cooking Basics: 10 Essential Meals",
      summary: "Master simple, healthy meals that will save you money and improve your nutrition.",
      difficulty: "Beginner",
      duration: "25 min",
      description: "Stop surviving on takeout and learn to cook nutritious, delicious meals. This guide covers 10 essential recipes that every young adult should know, from pasta to stir-fry to breakfast options.",
      steps: [
        "Set up your kitchen with basic tools and ingredients",
        "Learn knife safety and basic cutting techniques",
        "Master cooking methods: boiling, sautéing, baking, and grilling",
        "Practice meal prep and planning for the week",
        "Understand food safety and proper storage",
        "Build confidence with simple one-pot meals",
        "Learn to cook proteins: chicken, eggs, fish, and beans",
        "Master basic starches: rice, pasta, and potatoes",
        "Add vegetables and flavor with herbs and spices",
        "Create your own recipe collection and meal rotation"
      ],
      tasks: [
        {
          id: "cooking-1",
          text: "Purchase essential cooking tools and pantry staples",
          completed: false,
          timeEstimate: "60 mins",
          difficulty: "Easy",
          cost: "$80-120",
          microActions: [
            {
              text: "Buy basic tools: chef knife, cutting board, pans, wooden spoons",
              time: "30 mins",
              resources: ["https://www.amazon.com/s?k=basic+cooking+tools+set", "https://www.target.com/c/kitchen-utensils", "https://www.ikea.com/us/en/cat/kitchen-accessories-18864/"]
            },
            {
              text: "Stock pantry basics: olive oil, salt, pepper, garlic, onions",
              time: "20 mins",
              resources: ["https://www.budgetbytes.com/stock-kitchen-pantry-staples/", "https://www.foodnetwork.com/how-to/packages/food-network-essentials/pantry-essentials"]
            },
            {
              text: "Get measuring cups, mixing bowls, and basic spices",
              time: "10 mins",
              resources: ["https://www.williams-sonoma.com/shop/cookware/measuring-tools/", "https://www.amazon.com/s?k=measuring+cups+set"]
            }
          ]
        },
        {
          id: "cooking-2",
          text: "Learn proper knife skills and food prep techniques",
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Watch knife safety video and practice holding technique",
              time: "15 mins",
              resources: ["https://www.youtube.com/watch?v=JMA2SqaDgG8", "https://www.masterclass.com/articles/knife-skills-101"]
            },
            {
              text: "Practice basic cuts: dice, chop, mince, and slice",
              time: "20 mins",
              resources: ["https://www.youtube.com/watch?v=nffGuGwCdJs", "https://www.seriouseats.com/knife-skills-how-to-hold-a-knife"]
            },
            {
              text: "Learn to prep vegetables safely and efficiently",
              time: "10 mins",
              resources: ["https://www.foodnetwork.com/how-to/articles/knife-skills-how-to-prep-vegetables", "https://www.bonappetit.com/story/how-to-prep-vegetables"]
            }
          ]
        },
        {
          id: "cooking-3",
          text: "Cook 3 simple one-pot meals successfully",
          completed: false,
          timeEstimate: "90 mins",
          difficulty: "Medium",
          cost: "$15-25",
          microActions: [
            {
              text: "Make pasta with marinara sauce and vegetables",
              time: "30 mins",
              resources: ["https://www.budgetbytes.com/pasta-with-vegetables/", "https://www.allrecipes.com/recipe/11679/simple-macaroni-and-cheese/"]
            },
            {
              text: "Prepare a basic stir-fry with protein and vegetables",
              time: "30 mins",
              resources: ["https://www.food.com/recipe/basic-stir-fry-484395", "https://www.tasteofhome.com/recipes/easy-chicken-stir-fry/"]
            },
            {
              text: "Cook scrambled eggs with toast and fruit",
              time: "30 mins",
              resources: ["https://www.incredibleegg.org/recipe-collections/basic-recipes/", "https://www.foodnetwork.com/recipes/alton-brown/perfect-scrambled-eggs-recipe-1939782"]
            }
          ]
        }
      ],
      tips: [
        "Start with simple recipes and gradually build complexity",
        "Taste as you go and adjust seasoning",
        "Prep all ingredients before you start cooking (mise en place)",
        "Keep it simple - salt, pepper, garlic, and lemon go with almost everything",
        "Don't be afraid to make mistakes - that's how you learn"
      ],
      icon: Utensils,
    },
    {
      title: "Cleaning & Organization Systems",
      summary: "Create sustainable cleaning routines that keep your space healthy and organized.",
      difficulty: "Beginner", 
      duration: "30 min",
      description: "Transform your living space from chaotic to clean with proven organization systems. Learn daily, weekly, and monthly cleaning routines that prevent overwhelm and create a space you love coming home to.",
      steps: [
        "Assess your current space and identify problem areas",
        "Declutter room by room using the keep/donate/trash method",
        "Create designated homes for every item you own",
        "Establish daily cleaning habits that take less than 15 minutes",
        "Build weekly cleaning routines for deeper maintenance",
        "Learn efficient cleaning techniques for every room",
        "Organize your cleaning supplies and tools",
        "Create systems for managing papers and digital clutter",
        "Develop habits for maintaining organization long-term",
        "Set up seasonal deep cleaning schedules"
      ],
      tasks: [
        {
          id: "cleaning-1",
          text: "Declutter one room completely using the 3-box method",
          completed: false,
          timeEstimate: "2-3 hours",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Get 3 boxes/bags labeled 'Keep', 'Donate', 'Trash'",
              time: "5 mins",
              resources: ["https://www.thespruce.com/how-to-declutter-any-room-1900522", "https://www.youtube.com/watch?v=VXjewQBjByk"]
            },
            {
              text: "Sort every item in the room into the appropriate box",
              time: "90-120 mins",
              resources: ["https://www.becomingminimalist.com/how-to-declutter/", "https://konmari.com/pages/about/"]
            },
            {
              text: "Take donation items to charity immediately",
              time: "30 mins",
              resources: ["https://www.goodwill.org/donate/donate-goods/", "https://www.salvationarmyusa.org/usn/donate/"]
            },
            {
              text: "Find proper homes for all 'keep' items",
              time: "30 mins",
              resources: ["https://www.realsimple.com/home-organizing/organizing/organizing-room-by-room", "https://www.containerstore.com/organizing"]
            }
          ]
        },
        {
          id: "cleaning-2",
          text: "Create a 15-minute daily cleaning routine",
          completed: false,
          timeEstimate: "30 mins planning",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "List 5-7 quick daily tasks (make bed, dishes, wipe counters)",
              time: "10 mins",
              resources: ["https://www.flylady.net/d/getting-started/", "https://www.thehappyhousie.com/15-minute-daily-cleaning-routine/"]
            },
            {
              text: "Set a daily alarm and practice routine for one week",
              time: "15 mins/day",
              resources: ["https://www.habitica.com/", "https://play.google.com/store/apps/details?id=com.habitrpg.android.habitica"]
            },
            {
              text: "Adjust routine based on what works for your schedule",
              time: "5 mins",
              resources: ["https://www.todoist.com/productivity-methods/getting-things-done", "https://bulletjournal.com/"]
            }
          ]
        },
        {
          id: "cleaning-3",
          text: "Organize cleaning supplies and create a weekly schedule",
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Easy",
          cost: "$30-50",
          microActions: [
            {
              text: "Buy basic cleaning supplies: all-purpose cleaner, microfiber cloths, vacuum",
              time: "30 mins",
              resources: ["https://www.target.com/c/cleaning-supplies", "https://www.amazon.com/s?k=basic+cleaning+kit", "https://www.walmart.com/browse/household-essentials/cleaning-supplies"]
            },
            {
              text: "Create a cleaning caddy or organize supplies in one area",
              time: "10 mins",
              resources: ["https://www.containerstore.com/s/cleaning/cleaning-caddies", "https://www.pinterest.com/search/pins/?q=cleaning+supplies+organization"]
            },
            {
              text: "Write out weekly cleaning schedule (bathrooms Monday, kitchen Tuesday, etc.)",
              time: "5 mins",
              resources: ["https://www.cleanmama.com/blog/weekly-cleaning-schedule", "https://www.marthastewart.com/1535282/how-create-house-cleaning-schedule"]
            }
          ]
        }
      ],
      tips: [
        "Clean as you go to prevent buildup",
        "Use the 'one minute rule' - if it takes less than a minute, do it now",
        "Everything should have a designated home",
        "Do a little bit daily rather than marathon cleaning sessions",
        "Start with one room and perfect that system before moving on"
      ],
      icon: Sparkles,
    },
    {
      title: "Time Management & Productivity",
      summary: "Master your schedule and stop feeling overwhelmed with proven time management systems.",
      difficulty: "Intermediate",
      duration: "35 min",
      description: "Take control of your time and boost your productivity with systems that actually work. Learn to prioritize effectively, eliminate distractions, and create sustainable routines that help you achieve your goals without burning out.",
      steps: [
        "Audit your current time usage and identify time wasters",
        "Learn proven prioritization methods like the Eisenhower Matrix",
        "Set up digital and physical planning systems that work for you",
        "Create morning and evening routines for consistent productivity",
        "Master the art of saying no to time-wasting commitments",
        "Build focus blocks and manage interruptions effectively",
        "Use time-blocking to allocate energy to your most important tasks",
        "Develop systems for managing email and digital distractions",
        "Create accountability systems and track your progress",
        "Balance productivity with rest and recovery time"
      ],
      tasks: [
        {
          id: "time-1",
          text: "Complete a 3-day time audit to understand current habits",
          completed: false,
          timeEstimate: "20 mins/day for 3 days",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Download time tracking app or use simple paper log",
              time: "10 mins",
              resources: ["https://toggl.com/", "https://www.rescuetime.com/", "https://clockify.me/"]
            },
            {
              text: "Log activities every 30 minutes for 3 days",
              time: "2 mins every 30 mins",
              resources: ["https://www.timeanddate.com/stopwatch/", "https://pomofocus.io/"]
            },
            {
              text: "Analyze patterns and identify time wasters",
              time: "15 mins",
              resources: ["https://www.notion.so/templates/categories/productivity", "https://www.youtube.com/watch?v=tT89OZ7TNwc"]
            }
          ]
        },
        {
          id: "time-2", 
          text: "Set up a task management system and prioritization method",
          completed: false,
          timeEstimate: "60 mins",
          difficulty: "Medium",
          cost: "Free-$10/month",
          microActions: [
            {
              text: "Choose task management tool (Todoist, Notion, or paper planner)",
              time: "20 mins",
              resources: ["https://todoist.com/", "https://www.notion.so/", "https://bulletjournal.com/"]
            },
            {
              text: "Learn Eisenhower Matrix for prioritizing tasks",
              time: "15 mins",
              resources: ["https://www.eisenhower.me/eisenhower-matrix/", "https://www.youtube.com/watch?v=tT89OZ7TNwc"]
            },
            {
              text: "Input all current tasks and categorize by urgency/importance",
              time: "25 mins",
              resources: ["https://gettingthingsdone.com/", "https://www.productivitygame.com/"]
            }
          ]
        },
        {
          id: "time-3",
          text: "Create and test time-blocking schedule for one week",
          completed: false,
          timeEstimate: "45 mins setup + daily practice",
          difficulty: "Medium", 
          cost: "Free",
          microActions: [
            {
              text: "List all regular commitments (work, class, meals, sleep)",
              time: "15 mins",
              resources: ["https://www.google.com/calendar", "https://outlook.live.com/calendar/"]
            },
            {
              text: "Block time for focused work, admin tasks, and personal time",
              time: "20 mins",
              resources: ["https://www.calnewport.com/blog/2013/12/21/deep-work-how-to-accomplish-more-by-doing-less/", "https://clockify.me/time-blocking"]
            },
            {
              text: "Test schedule for one week and adjust based on what works",
              time: "10 mins daily review",
              resources: ["https://www.youtube.com/watch?v=ALaTm6VzTBw", "https://jamesclear.com/time-blocking"]
            }
          ]
        }
      ],
      tips: [
        "Focus on systems and habits rather than motivation",
        "Start with just 2-3 small changes and build from there",
        "Schedule buffer time between commitments",
        "Batch similar tasks together for efficiency",
        "Review and adjust your systems weekly"
      ],
      icon: Clock,
    },
    {
      title: "Basic Home Maintenance & Safety",
      summary: "Learn essential home maintenance skills to save money and keep your space safe.",
      difficulty: "Beginner",
      duration: "40 min",
      description: "Stop calling maintenance for every small issue. Learn basic home maintenance skills that will save you hundreds of dollars and give you confidence in your living space. From unclogging drains to changing filters, these skills are essential for any renter or homeowner.",
      steps: [
        "Identify and locate important systems in your home (electrical panel, water shut-off, etc.)",
        "Learn basic tool usage and safety procedures",
        "Master simple plumbing fixes like unclogging drains and toilets",
        "Understand electrical basics and when to call a professional",
        "Learn proper techniques for patching holes and touching up paint",
        "Maintain appliances to prevent costly repairs",
        "Create seasonal maintenance checklists",
        "Know emergency procedures and important contact numbers",
        "Understand when DIY is appropriate vs when to hire professionals",
        "Build a basic toolkit for common household repairs"
      ],
      tasks: [
        {
          id: "maintenance-1",
          text: "Create home safety and emergency contact list",
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Locate and test smoke detector batteries",
              time: "10 mins",
              resources: ["https://www.nfpa.org/Public-Education/Fire-causes-and-risks/Smoke-alarms", "https://www.youtube.com/watch?v=8XEExGXFIEk"]
            },
            {
              text: "Find main water shut-off valve and electrical panel",
              time: "10 mins",
              resources: ["https://www.familyhandyman.com/article/how-to-shut-off-water-to-your-house/", "https://www.bobvila.com/articles/where-is-the-main-water-shut-off-valve/"]
            },
            {
              text: "Save emergency numbers (building manager, utilities, etc.)",
              time: "10 mins",
              resources: ["https://www.ready.gov/make-a-plan", "https://www.redcross.org/get-help/how-to-prepare-for-emergencies"]
            }
          ]
        },
        {
          id: "maintenance-2",
          text: "Build basic toolkit with essential tools",
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Easy",
          cost: "$40-80",
          microActions: [
            {
              text: "Buy basic tools: screwdrivers, hammer, pliers, measuring tape",
              time: "30 mins",
              resources: ["https://www.homedepot.com/b/Tools/Basic-Tool-Sets", "https://www.amazon.com/s?k=basic+home+tool+kit", "https://www.harborfreight.com/hand-tools.html"]
            },
            {
              text: "Get utility items: flashlight, batteries, duct tape, WD-40",
              time: "10 mins",
              resources: ["https://www.lowes.com/c/Hardware", "https://www.target.com/c/tools-hardware"]
            },
            {
              text: "Organize tools in toolbox or designated area",
              time: "5 mins",
              resources: ["https://www.containerstore.com/s/garage/tool-storage", "https://www.pinterest.com/search/pins/?q=small+apartment+tool+storage"]
            }
          ]
        },
        {
          id: "maintenance-3",
          text: "Learn and practice 3 basic maintenance skills",
          completed: false,
          timeEstimate: "90 mins",
          difficulty: "Medium",
          cost: "$10-20",
          microActions: [
            {
              text: "Learn to unclog a drain using plunger and basic tools",
              time: "30 mins",
              resources: ["https://www.youtube.com/watch?v=Lbpj2pru3Dk", "https://www.familyhandyman.com/project/how-to-unclog-a-drain/"]
            },
            {
              text: "Practice changing air filter and light bulbs safely",
              time: "30 mins",
              resources: ["https://www.youtube.com/watch?v=1z4RyJ0qbuk", "https://www.energy.gov/energysaver/maintaining-your-air-conditioner"]
            },
            {
              text: "Learn to patch small holes in drywall",
              time: "30 mins",
              resources: ["https://www.youtube.com/watch?v=17awCvTIF0U", "https://www.thisoldhouse.com/walls/21016436/how-to-patch-a-hole-in-drywall"]
            }
          ]
        }
      ],
      tips: [
        "When in doubt, call a professional - safety first",
        "Turn off power/water before attempting any repairs",
        "Take photos before taking things apart",
        "Start with small projects to build confidence",
        "Keep warranty information and user manuals organized"
      ],
      icon: Wrench,
    },
    {
      title: "Digital Literacy & Online Safety",
      summary: "Master essential digital skills and protect yourself online in today's connected world.",
      difficulty: "Beginner",
      duration: "45 min",
      description: "Navigate the digital world safely and efficiently. Learn essential computer skills, protect your personal information online, and use technology to enhance rather than complicate your life. From password security to digital file organization, these skills are crucial for modern life.",
      steps: [
        "Set up strong password management and two-factor authentication",
        "Learn to identify and avoid online scams and phishing attempts",
        "Organize digital files and create backup systems",
        "Understand privacy settings on social media and apps",
        "Master basic computer maintenance and troubleshooting",
        "Learn efficient internet research and fact-checking techniques",
        "Set up professional online presence (LinkedIn, email signature)",
        "Understand digital footprint and online reputation management",
        "Create systems for managing digital subscriptions and accounts",
        "Learn basic spreadsheet and document formatting skills"
      ],
      tasks: [
        {
          id: "digital-1",
          text: "Set up password manager and secure all accounts",
          completed: false,
          timeEstimate: "90 mins",
          difficulty: "Medium",
          cost: "Free-$3/month",
          microActions: [
            {
              text: "Choose and install password manager (Bitwarden, 1Password, etc.)",
              time: "20 mins",
              resources: ["https://bitwarden.com/", "https://1password.com/", "https://www.lastpass.com/"]
            },
            {
              text: "Create strong master password and security questions",
              time: "15 mins",
              resources: ["https://www.security.org/how-secure-is-my-password/", "https://xkcd.com/936/"]
            },
            {
              text: "Add all existing accounts and update weak passwords",
              time: "45 mins",
              resources: ["https://haveibeenpwned.com/", "https://www.google.com/landing/2step/"]
            },
            {
              text: "Enable two-factor authentication on important accounts",
              time: "10 mins",
              resources: ["https://authy.com/", "https://support.google.com/accounts/answer/185839"]
            }
          ]
        },
        {
          id: "digital-2",
          text: "Organize digital files and set up backup system",
          completed: false,
          timeEstimate: "60 mins",
          difficulty: "Easy",
          cost: "Free-$5/month",
          microActions: [
            {
              text: "Create logical folder structure for documents, photos, etc.",
              time: "30 mins",
              resources: ["https://www.howtogeek.com/howto/15677/zen-and-the-art-of-file-and-folder-organization/", "https://www.lifehacker.com.au/2014/03/ask-lh-whats-the-best-way-to-organise-my-files/"]
            },
            {
              text: "Set up cloud backup (Google Drive, iCloud, Dropbox)",
              time: "20 mins",
              resources: ["https://www.google.com/drive/", "https://www.dropbox.com/", "https://www.icloud.com/"]
            },
            {
              text: "Delete unnecessary files and organize remaining ones",
              time: "10 mins",
              resources: ["https://support.microsoft.com/en-us/windows/disk-cleanup-in-windows-10-8a96ff42-5751-39ad-23d6-434b4d5b9a68"]
            }
          ]
        },
        {
          id: "digital-3",
          text: "Review and secure social media privacy settings",
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Audit all social media accounts and privacy settings",
              time: "25 mins",
              resources: ["https://www.facebook.com/help/325807937506242", "https://help.instagram.com/116024195217477", "https://help.twitter.com/en/safety-and-security/how-to-make-twitter-private"]
            },
            {
              text: "Remove old posts or photos that don't represent you professionally",
              time: "15 mins",
              resources: ["https://www.careerbuilder.com/advice/social-media-survey-2018", "https://blog.hootsuite.com/spring-clean-social-media/"]
            },
            {
              text: "Set up professional LinkedIn profile if career-relevant",
              time: "5 mins",
              resources: ["https://www.linkedin.com/help/linkedin/answer/430/creating-your-linkedin-profile-overview", "https://blog.linkedin.com/2017/february/17/-tips-for-building-a-great-linkedin-profile-career-expert"]
            }
          ]
        }
      ],
      tips: [
        "If something seems too good to be true online, it probably is",
        "Never give personal information via email or unsolicited calls",
        "Keep software and operating systems updated for security",
        "Use different passwords for different types of accounts",
        "Be mindful of what you share - the internet is forever"
      ],
      icon: Shield,
    },
    {
      title: "Personal Finance & Budgeting Basics",
      summary: "Take control of your money with simple budgeting and financial planning strategies.",
      difficulty: "Beginner",
      duration: "50 min",
      description: "Stop living paycheck to paycheck and start building wealth. Learn practical budgeting methods, track your spending, and create financial goals that actually work. This isn't about restricting yourself - it's about giving every dollar a purpose.",
      steps: [
        "Calculate your true monthly income and fixed expenses",
        "Track your spending for one week to understand your habits",
        "Choose a budgeting method that fits your lifestyle (50/30/20, envelope, etc.)",
        "Set up automatic savings for your financial goals",
        "Learn to distinguish between wants and needs",
        "Create emergency fund and debt payoff strategies",
        "Use apps and tools to automate your financial system",
        "Plan for irregular expenses like car repairs and holidays",
        "Build accountability systems to stick to your budget",
        "Adjust and refine your budget based on real results"
      ],
      tasks: [
        {
          id: "budget-1",
          text: "Calculate monthly income and list all fixed expenses",
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Gather pay stubs, bank statements, and bill statements",
              time: "15 mins",
              resources: ["https://www.mint.com/", "https://www.youneedabudget.com/", "https://www.personalcapital.com/"]
            },
            {
              text: "Calculate net monthly income (after taxes)",
              time: "10 mins",
              resources: ["https://smartasset.com/taxes/paycheck-calculator", "https://www.adp.com/resources/tools/calculators/salary-paycheck-calculator.aspx"]
            },
            {
              text: "List all fixed expenses: rent, utilities, phone, insurance, minimums",
              time: "20 mins",
              resources: ["https://www.nerdwallet.com/article/finance/budget-worksheet", "https://www.vertex42.com/ExcelTemplates/budget-planner.html"]
            }
          ]
        },
        {
          id: "budget-2",
          text: "Track all spending for one full week",
          completed: false,
          timeEstimate: "5 mins daily for 1 week",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Choose tracking method: app, notebook, or spreadsheet",
              time: "10 mins",
              resources: ["https://mint.intuit.com/", "https://www.spendee.com/", "https://www.everydollar.com/"]
            },
            {
              text: "Record every purchase, no matter how small",
              time: "2 mins per transaction",
              resources: ["https://www.youtube.com/watch?v=sVKQn2H7Bx4", "https://www.daveramsey.com/blog/how-to-budget-money"]
            },
            {
              text: "Categorize expenses: food, transportation, entertainment, etc.",
              time: "15 mins at end of week",
              resources: ["https://www.consumerreports.org/personal-finance/how-to-create-a-budget/", "https://www.khanacademy.org/economics-finance-domain/core-finance/investment-vehicles-tutorial/ira-401ks/v/traditional-iras"]
            }
          ]
        },
        {
          id: "budget-3",
          text: "Create your first budget using the 50/30/20 method",
          completed: false,
          timeEstimate: "60 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Allocate 50% of income to needs (rent, utilities, groceries)",
              time: "15 mins",
              resources: ["https://www.nerdwallet.com/article/finance/nerdwallet-budget-calculator", "https://www.investopedia.com/ask/answers/022916/what-502030-budget-rule.asp"]
            },
            {
              text: "Allocate 30% to wants (dining out, entertainment, hobbies)",
              time: "15 mins",
              resources: ["https://www.ramseysolutions.com/budgeting/quick-guide-to-budgeting", "https://www.creditkarma.com/advice/i/how-to-budget/"]
            },
            {
              text: "Allocate 20% to savings and debt payments",
              time: "15 mins",
              resources: ["https://www.ally.com/do-it-right/money/create-a-budget-in-6-simple-steps/", "https://www.schwab.com/resource-center/insights/content/budgeting-101"]
            },
            {
              text: "Set up automatic transfers for savings and bill payments",
              time: "15 mins",
              resources: ["https://www.bankrate.com/banking/savings/automatic-savings-tips/", "https://www.wellsfargo.com/online-banking/features/automatic-bill-pay/"]
            }
          ]
        }
      ],
      tips: [
        "Start small - even $25/month in savings builds the habit",
        "Pay yourself first by automating savings before you can spend it",
        "Use the 24-hour rule for non-essential purchases over $50",
        "Review and adjust your budget monthly based on real spending",
        "Don't aim for perfection - aim for progress"
      ],
      icon: Calculator,
    },
    {
      title: "Communication Skills & Conflict Resolution",
      summary: "Master essential communication skills for better relationships and professional success.",
      difficulty: "Intermediate",
      duration: "40 min",
      description: "Transform your relationships and career prospects with powerful communication skills. Learn to express yourself clearly, listen actively, and handle difficult conversations with confidence. These skills will serve you in every area of life.",
      steps: [
        "Learn active listening techniques and body language basics",
        "Practice clear, assertive communication without being aggressive",
        "Master the art of giving and receiving constructive feedback",
        "Develop conflict resolution strategies for personal and professional settings",
        "Learn to set healthy boundaries in relationships",
        "Build confidence in public speaking and presentations",
        "Understand different communication styles and how to adapt",
        "Practice emotional regulation during difficult conversations",
        "Learn networking and relationship-building skills",
        "Develop empathy and emotional intelligence"
      ],
      tasks: [
        {
          id: "comm-1",
          text: "Practice active listening with friends or family for one week",
          completed: false,
          timeEstimate: "Daily practice",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Learn the 3 levels of listening: internal, focused, global",
              time: "20 mins",
              resources: ["https://www.mindtools.com/CommSkll/ActiveListening.htm", "https://www.youtube.com/watch?v=rzsVh8YwZEQ"]
            },
            {
              text: "Practice reflecting back what you heard before responding",
              time: "Daily practice",
              resources: ["https://www.skillsyouneed.com/ips/active-listening.html", "https://www.verywellmind.com/what-is-active-listening-3024343"]
            },
            {
              text: "Focus on understanding rather than waiting to speak",
              time: "Ongoing awareness",
              resources: ["https://www.ted.com/talks/celeste_headlee_10_ways_to_have_a_better_conversation", "https://hbr.org/2016/07/what-great-listeners-actually-do"]
            }
          ]
        },
        {
          id: "comm-2",
          text: "Learn and practice assertive communication techniques",
          completed: false,
          timeEstimate: "60 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Learn the difference between passive, aggressive, and assertive communication",
              time: "20 mins",
              resources: ["https://www.mayo.clinic.org/healthy-lifestyle/stress-management/in-depth/assertive/art-20044644", "https://www.mindtools.com/pages/article/Assertiveness.htm"]
            },
            {
              text: "Practice 'I' statements for expressing needs and feelings",
              time: "20 mins",
              resources: ["https://www.therapistaid.com/therapy-worksheet/i-statements", "https://www.youtube.com/watch?v=r4g8S7y0y2c"]
            },
            {
              text: "Role-play difficult conversations with a trusted friend",
              time: "20 mins",
              resources: ["https://www.skillsyouneed.com/ips/assertiveness.html", "https://www.psychologytoday.com/us/blog/the-dance-connection/201407/how-be-assertive-not-aggressive"]
            }
          ]
        },
        {
          id: "comm-3",
          text: "Handle one difficult conversation using conflict resolution skills",
          completed: false,
          timeEstimate: "Varies",
          difficulty: "Hard",
          cost: "Free",
          microActions: [
            {
              text: "Choose a low-stakes conflict to practice with",
              time: "5 mins planning",
              resources: ["https://www.ccl.org/articles/leading-effectively-articles/the-real-secret-to-resolving-conflict/", "https://www.mindtools.com/pages/article/newLDR_81.htm"]
            },
            {
              text: "Use the DESC method: Describe, Express, Specify, Consequences",
              time: "During conversation",
              resources: ["https://www.skillsyouneed.com/ips/desc.html", "https://www.therapistaid.com/therapy-worksheet/assertiveness-and-the-desc-script"]
            },
            {
              text: "Focus on finding common ground and win-win solutions",
              time: "During conversation",
              resources: ["https://www.harvard.edu/blog/the-psychology-of-negotiation/", "https://www.pon.harvard.edu/daily/conflict-resolution/conflict-resolution-strategies/"]
            }
          ]
        }
      ],
      tips: [
        "Listen to understand, not to be right",
        "Use body language that matches your words",
        "Take breaks during heated conversations to cool down",
        "Ask questions to clarify before making assumptions",
        "Practice empathy by trying to see the other person's perspective"
      ],
      icon: MessageCircle,
    },
    {
      title: "Health & Wellness Fundamentals",
      summary: "Build sustainable habits for physical and mental health that fit your busy life.",
      difficulty: "Beginner",
      duration: "35 min",
      description: "Create a foundation for lifelong health without overwhelming yourself. Learn practical strategies for nutrition, exercise, sleep, and stress management that actually work for real people with real schedules.",
      steps: [
        "Establish a consistent sleep schedule and bedtime routine",
        "Learn basic nutrition principles and meal planning",
        "Find physical activities you actually enjoy and will stick to",
        "Develop stress management techniques for daily use",
        "Understand when and how to access healthcare services",
        "Build mental health awareness and coping strategies",
        "Create healthy boundaries with technology and social media",
        "Learn basic first aid and emergency preparedness",
        "Develop body awareness and injury prevention habits",
        "Build social connections that support your wellbeing"
      ],
      tasks: [
        {
          id: "health-1",
          text: "Establish consistent sleep schedule and optimize sleep environment",
          completed: false,
          timeEstimate: "60 mins setup + 1 week practice",
          difficulty: "Easy",
          cost: "$0-30",
          microActions: [
            {
              text: "Set consistent bedtime and wake time (even on weekends)",
              time: "5 mins planning",
              resources: ["https://www.sleepfoundation.org/how-sleep-works/how-much-sleep-do-we-really-need", "https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html"]
            },
            {
              text: "Create screen-free wind-down routine 1 hour before bed",
              time: "30 mins setup",
              resources: ["https://www.sleepfoundation.org/sleep-hygiene/blue-light-and-sleep", "https://www.health.harvard.edu/staying-healthy/blue-light-has-a-dark-side"]
            },
            {
              text: "Optimize bedroom: dark, cool (65-68°F), quiet",
              time: "20 mins",
              resources: ["https://www.sleepfoundation.org/bedroom-environment", "https://www.mayoclinic.org/healthy-lifestyle/adult-health/in-depth/sleep/art-20048379"]
            },
            {
              text: "Track sleep for one week to identify patterns",
              time: "5 mins daily",
              resources: ["https://www.fitbit.com/global/us/technology/sleep", "https://sleepyti.me/", "https://apps.apple.com/us/app/sleep-cycle-sleep-tracker/id320606217"]
            }
          ]
        },
        {
          id: "health-2",
          text: "Plan and prepare 3 healthy, simple meals",
          completed: false,
          timeEstimate: "90 mins",
          difficulty: "Easy",
          cost: "$20-40",
          microActions: [
            {
              text: "Learn basic nutrition: protein, healthy fats, vegetables, whole grains",
              time: "20 mins",
              resources: ["https://www.hsph.harvard.edu/nutritionsource/healthy-eating-plate/", "https://www.choosemyplate.gov/"]
            },
            {
              text: "Plan 3 simple meals using the plate method (1/2 vegetables, 1/4 protein, 1/4 grains)",
              time: "15 mins",
              resources: ["https://www.diabetes.org/healthy-living/recipes-nutrition/meal-planning/create-your-plate", "https://www.eatright.org/food/vitamins-and-supplements/nutrient-rich-foods/the-basics-of-the-nutrition-facts-label"]
            },
            {
              text: "Shop for ingredients and prep meals",
              time: "45 mins",
              resources: ["https://www.budgetbytes.com/category/extra-bytes/beginner/", "https://www.eatingwell.com/recipes/22588/healthy-main-dish-recipes/"]
            },
            {
              text: "Cook and eat the meals, noting energy levels and satisfaction",
              time: "10 mins per meal",
              resources: ["https://www.mindful.org/how-to-practice-mindful-eating/", "https://www.health.harvard.edu/blog/mindful-eating-may-help-with-weight-loss-201102041151"]
            }
          ]
        },
        {
          id: "health-3",
          text: "Find and commit to one physical activity for 2 weeks",
          completed: false,
          timeEstimate: "30 mins research + ongoing practice",
          difficulty: "Easy",
          cost: "$0-50",
          microActions: [
            {
              text: "Identify activities you enjoyed as a kid or want to try",
              time: "10 mins",
              resources: ["https://www.cdc.gov/physicalactivity/basics/getting-started/index.htm", "https://www.youtube.com/results?search_query=beginner+home+workouts"]
            },
            {
              text: "Start with 10-15 minutes, 3 times per week",
              time: "Planning",
              resources: ["https://www.nhs.uk/live-well/exercise/running-and-aerobic-exercises/get-running-with-couch-to-5k/", "https://www.fitnessblender.com/"]
            },
            {
              text: "Try walking, dancing, yoga, or bodyweight exercises at home",
              time: "15 mins per session",
              resources: ["https://www.youtube.com/user/yogawithadriene", "https://www.youtube.com/user/FitnessBlender", "https://www.strava.com/"]
            },
            {
              text: "Track how you feel before and after exercise",
              time: "2 mins per session",
              resources: ["https://www.moodpath.com/en/", "https://daylio.net/"]
            }
          ]
        }
      ],
      tips: [
        "Start small and build consistency before increasing intensity",
        "Focus on how healthy habits make you feel, not just how you look",
        "Find an accountability partner or join online communities",
        "Don't aim for perfection - aim for better than yesterday",
        "Listen to your body and rest when you need it"
      ],
      icon: Heart,
    },
    {
      title: "Social Skills & Relationship Building",
      summary: "Develop meaningful relationships and navigate social situations with confidence.",
      difficulty: "Intermediate",
      duration: "45 min",
      description: "Build genuine connections and improve your social confidence. Learn to make friends as an adult, maintain healthy relationships, and navigate social situations without anxiety. These skills will enrich every area of your life.",
      steps: [
        "Understand different types of relationships and their boundaries",
        "Learn conversation starters and how to keep discussions flowing",
        "Practice reading social cues and body language",
        "Develop empathy and emotional intelligence",
        "Learn to make friends as an adult in new environments",
        "Master the art of networking without feeling sleazy",
        "Build confidence in group settings and social events",
        "Learn to handle social anxiety and rejection gracefully",
        "Understand healthy vs unhealthy relationship patterns",
        "Practice setting and respecting boundaries"
      ],
      tasks: [
        {
          id: "social-1",
          text: "Practice conversation skills with 3 new people this week",
          completed: false,
          timeEstimate: "Ongoing practice",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Learn 5 open-ended conversation starters",
              time: "15 mins",
              resources: ["https://www.improveyoursocialskills.com/conversation-starters", "https://www.youtube.com/watch?v=R1vskiVDwl4"]
            },
            {
              text: "Practice active listening and asking follow-up questions",
              time: "During conversations",
              resources: ["https://www.mindtools.com/CommSkll/ActiveListening.htm", "https://www.ted.com/talks/celeste_headlee_10_ways_to_have_a_better_conversation"]
            },
            {
              text: "Start conversations with cashiers, neighbors, or classmates",
              time: "2-5 mins each",
              resources: ["https://www.succeedsocially.com/talkingtopeople", "https://www.improveyoursocialskills.com/"]
            },
            {
              text: "Reflect on what worked well and what to improve",
              time: "5 mins daily",
              resources: ["https://www.psychologytoday.com/us/blog/fulfillment-any-age/201407/5-ways-improve-your-social-skills", "https://journals.self/"]
            }
          ]
        },
        {
          id: "social-2",
          text: "Join one social group or activity to meet like-minded people",
          completed: false,
          timeEstimate: "60 mins research + ongoing participation",
          difficulty: "Medium",
          cost: "$0-50",
          microActions: [
            {
              text: "Research local groups: Meetup, hobby clubs, volunteer organizations",
              time: "30 mins",
              resources: ["https://www.meetup.com/", "https://www.volunteermatch.org/", "https://www.facebook.com/events/discovery/"]
            },
            {
              text: "Choose activity based on your interests, not just meeting people",
              time: "15 mins",
              resources: ["https://www.bumble.com/bff", "https://www.reddit.com/r/socialskills/", "https://www.toastmasters.org/"]
            },
            {
              text: "Attend consistently for at least 3 sessions before judging",
              time: "Varies",
              resources: ["https://www.psychologytoday.com/us/blog/the-friendship-doctor/201107/making-friends-adult-why-is-it-so-hard", "https://www.nytimes.com/2012/07/15/fashion/the-challenge-of-making-friends-as-an-adult.html"]
            },
            {
              text: "Follow up with people you connect with outside the group",
              time: "5-10 mins",
              resources: ["https://www.artofmanliness.com/articles/how-to-make-friends-as-an-adult/", "https://www.lifehacker.com/how-to-make-friends-as-an-adult-1784215120"]
            }
          ]
        },
        {
          id: "social-3",
          text: "Practice setting healthy boundaries in one relationship",
          completed: false,
          timeEstimate: "Ongoing practice",
          difficulty: "Hard",
          cost: "Free",
          microActions: [
            {
              text: "Identify one relationship where you need better boundaries",
              time: "10 mins reflection",
              resources: ["https://www.psychologytoday.com/us/blog/communication-success/201407/when-is-it-time-let-toxic-friend-go", "https://www.mindbodygreen.com/articles/how-to-set-boundaries"]
            },
            {
              text: "Learn to say no politely but firmly",
              time: "15 mins practice",
              resources: ["https://www.mindtools.com/pages/article/how-to-say-no.htm", "https://www.youtube.com/watch?v=xOJUShhEKRI"]
            },
            {
              text: "Communicate your needs clearly using 'I' statements",
              time: "During interactions",
              resources: ["https://www.therapistaid.com/therapy-worksheet/i-statements", "https://www.skillsyouneed.com/ips/assertiveness.html"]
            },
            {
              text: "Follow through consistently on the boundaries you set",
              time: "Ongoing",
              resources: ["https://www.verywellmind.com/great-ways-to-set-boundaries-4177992", "https://www.ted.com/talks/brene_brown_the_power_of_vulnerability"]
            }
          ]
        }
      ],
      tips: [
        "Be genuinely interested in others rather than trying to be interesting",
        "Quality relationships matter more than quantity",
        "Don't take rejection personally - it's often about compatibility",
        "Be authentic rather than trying to please everyone", 
        "Consistency and showing up matters more than being perfect"
      ],
      icon: Users,
    },
    {
      title: "Goal Setting & Personal Development",
      summary: "Create meaningful goals and build systems to achieve them consistently.",
      difficulty: "Intermediate",
      duration: "55 min",
      description: "Stop setting goals you never achieve and start building systems that create lasting change. Learn proven goal-setting frameworks, build accountability systems, and develop the mindset and habits needed to become the person you want to be.",
      steps: [
        "Learn the difference between goals, systems, and habits",
        "Use SMART criteria to set achievable, meaningful goals",
        "Break large goals into actionable monthly and weekly steps",
        "Build accountability systems and track progress effectively",
        "Develop growth mindset and resilience for setbacks",
        "Create morning and evening routines that support your goals",
        "Learn to prioritize competing goals and manage your energy",
        "Build intrinsic motivation rather than relying on willpower",
        "Develop self-awareness through reflection and feedback",
        "Celebrate progress and adjust goals based on what you learn"
      ],
      tasks: [
        {
          id: "goal-1",
          text: "Set 3 SMART goals using proven goal-setting framework",
          completed: false,
          timeEstimate: "90 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Reflect on what you want to improve in life, career, health, relationships",
              time: "20 mins",
              resources: ["https://www.mindtools.com/pages/article/smart-goals.htm", "https://jamesclear.com/goal-setting"]
            },
            {
              text: "Choose 1 goal each for personal, professional, and health/wellness",
              time: "15 mins",
              resources: ["https://www.ted.com/talks/derek_sivers_keep_your_goals_to_yourself", "https://www.youtube.com/watch?v=NHopJHSlVo4"]
            },
            {
              text: "Write each goal using SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)",
              time: "30 mins",
              resources: ["https://www.smartsheet.com/blog/essential-guide-writing-smart-goals", "https://www.indeed.com/career-advice/career-development/how-to-write-smart-goals"]
            },
            {
              text: "Break each goal into 3-4 actionable steps you can take this month",
              time: "25 mins",
              resources: ["https://www.lifehack.org/articles/productivity/how-to-break-down-your-goals-into-actionable-steps.html", "https://www.projectmanager.com/blog/break-down-goals"]
            }
          ]
        },
        {
          id: "goal-2",
          text: "Create accountability system and progress tracking method",
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Easy",
          cost: "Free-$10",
          microActions: [
            {
              text: "Choose tracking method: app, journal, or spreadsheet",
              time: "15 mins",
              resources: ["https://habitica.com/", "https://www.stickk.com/", "https://www.notion.so/templates/habits"]
            },
            {
              text: "Set up weekly check-ins to review progress",
              time: "10 mins",
              resources: ["https://www.google.com/calendar", "https://todoist.com/", "https://bulletjournal.com/"]
            },
            {
              text: "Find accountability partner or join online community",
              time: "15 mins",
              resources: ["https://www.reddit.com/r/getmotivated/", "https://www.facebook.com/groups/", "https://www.meetup.com/topics/goals/"]
            },
            {
              text: "Plan how to celebrate milestones and handle setbacks",
              time: "5 mins",
              resources: ["https://www.psychologytoday.com/us/blog/prescriptions-life/201212/the-importance-celebrating-milestones", "https://www.mindful.org/how-to-bounce-back-from-failure/"]
            }
          ]
        },
        {
          id: "goal-3",
          text: "Build one keystone habit that supports multiple goals",
          completed: false,
          timeEstimate: "30 mins planning + 2 weeks practice",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Identify habits that would positively impact multiple areas of life",
              time: "15 mins",
              resources: ["https://jamesclear.com/atomic-habits", "https://charlesduhigg.com/the-power-of-habit/"]
            },
            {
              text: "Start with 2-minute version of the habit to build consistency",
              time: "Daily practice",
              resources: ["https://jamesclear.com/how-to-start-new-habit", "https://www.ted.com/talks/matt_cutts_try_something_new_for_30_days"]
            },
            {
              text: "Use habit stacking to attach new habit to existing routine",
              time: "5 mins planning",
              resources: ["https://jamesclear.com/habit-stacking", "https://www.youtube.com/watch?v=AdKUJxjn-R8"]
            },
            {
              text: "Track consistency for 2 weeks and adjust as needed",
              time: "2 mins daily",
              resources: ["https://www.habitify.me/", "https://apps.apple.com/us/app/streaks/id963034692"]
            }
          ]
        }
      ],
      tips: [
        "Focus on systems and processes rather than just outcomes",
        "Start smaller than you think you need to build momentum",
        "Review and adjust goals monthly based on what you learn",
        "Celebrate progress, not just completion",
        "Be patient with yourself - lasting change takes time"
      ],
      icon: Target,
    }
  ],
  "money-finance": [
  {
    title: "Open a Bank Account in 20 Minutes",
    summary: "What to bring, how to compare accounts, and avoiding hidden fees.",
      difficulty: "Beginner",
      duration: "20 min",
      description: "Take control of your finances by opening your first bank account. Learn to compare options, avoid fees, and set up essential banking services.",
      steps: [
        "Research banks in your area (traditional banks, credit unions, online banks)",
        "Compare account types: checking for daily expenses, savings for goals",
        "Check minimum balance requirements and monthly maintenance fees",
        "Look for fee-free ATM networks and online banking features",
        "Gather required documents: government ID, Social Security card, proof of address",
        "Bring initial deposit amount (usually $25-$100)",
        "Visit the bank or complete online application",
        "Review and sign account agreements carefully",
        "Set up online banking and mobile app access",
        "Order a debit card and set up your PIN",
        "Set up direct deposit with your employer",
        "Link external accounts if needed (other banks, investment accounts)"
      ],
      tasks: [
        { 
          id: "bank-1", 
          text: "Research and compare 3 different banks or credit unions", 
          completed: false,
          timeEstimate: "2 hours",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Visit NerdWallet.com or Bankrate.com for bank comparison tools",
              time: "15 mins",
              resources: ["https://www.nerdwallet.com/banking", "https://www.bankrate.com"]
            },
            {
              text: "Research local credit unions at MyCreditUnion.gov",
              time: "20 mins",
              resources: ["https://mapping.ncua.gov"]
            },
            {
              text: "Compare: monthly fees, minimum balance requirements, ATM networks",
              time: "25 mins",
              resources: []
            },
            {
              text: "Check: online banking features, mobile app ratings, customer service hours",
              time: "20 mins",
              resources: ["https://apps.apple.com", "https://play.google.com"]
            },
            {
              text: "Look at: overdraft fees, account opening bonuses, interest rates",
              time: "15 mins",
              resources: []
            },
            {
              text: "Read recent reviews on Google, Yelp, and Consumer Reports",
              time: "20 mins",
              resources: ["https://www.google.com/maps", "https://www.yelp.com", "https://www.consumerreports.org"]
            },
            {
              text: "Create spreadsheet comparing top 3 options side-by-side",
              time: "25 mins",
              resources: ["https://sheets.google.com", "https://www.microsoft.com/excel"]
            }
          ]
        },
        { 
          id: "bank-2", 
          text: "Choose the best checking account for your needs", 
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Calculate your typical monthly balance and transaction volume",
              time: "10 mins",
              resources: ["https://www.mint.com", "https://www.personalcapital.com", "https://sheets.google.com"]
            },
            {
              text: "Prioritize: no monthly fees vs. high interest vs. convenience",
              time: "5 mins",
              resources: ["https://www.nerdwallet.com/article/banking/checking-account-fees-how-to-avoid-them"]
            },
            {
              text: "Consider account requirements you can realistically meet",
              time: "5 mins",
              resources: ["https://www.consumerreports.org/checking-accounts/how-to-choose-a-checking-account/"]
            },
            {
              text: "Check if your employer has partnerships with specific banks",
              time: "5 mins",
              resources: ["https://www.hr.com", "https://www.workday.com"]
            },
            {
              text: "Look for student accounts if you're currently enrolled",
              time: "10 mins",
              resources: ["https://www.bankofamerica.com/deposits/student-banking/", "https://www.chase.com/personal/checking/student-checking", "https://www.wellsfargo.com/student/"]
            },
            {
              text: "Read all account terms and conditions carefully",
              time: "5 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/what-should-i-look-for-when-choosing-a-checking-account/"]
            },
            {
              text: "Make final decision and bookmark bank's website",
              time: "5 mins",
              resources: ["https://www.google.com/bookmarks"]
            }
          ]
        },
        { 
          id: "bank-3", 
          text: "Gather all required documents for account opening", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Get government-issued photo ID (driver's license or passport)",
              time: "5 mins",
              resources: ["https://www.dmv.org", "https://travel.state.gov/content/travel/en/passports.html"]
            },
            {
              text: "Obtain Social Security card or know your SSN by heart",
              time: "5 mins",
              resources: ["https://www.ssa.gov/number/", "https://www.ssa.gov/myaccount/"]
            },
            {
              text: "Gather proof of address: utility bill, lease, or bank statement",
              time: "10 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/what-do-i-need-to-open-a-bank-account/"]
            },
            {
              text: "Prepare initial deposit: cash, check, or transfer info",
              time: "5 mins",
              resources: ["https://www.bankrate.com/banking/checking/minimum-deposit-checking-account/"]
            },
            {
              text: "Bring employment information if required",
              time: "3 mins",
              resources: ["https://www.thebalance.com/what-you-need-to-open-a-bank-account-315298"]
            },
            {
              text: "Have backup ID ready in case primary is rejected",
              time: "1 min",
              resources: ["https://www.fdic.gov/consumers/assistance/protection/idtheft.html"]
            },
            {
              text: "Check bank's specific requirements on their website",
              time: "1 min",
              resources: ["https://www.chase.com", "https://www.bankofamerica.com", "https://www.wellsfargo.com"]
            }
          ]
        },
        { 
          id: "bank-4", 
          text: "Successfully open a checking account", 
          completed: false,
          timeEstimate: "1 hour",
          difficulty: "Medium",
          cost: "$25-100 initial deposit",
          microActions: [
            {
              text: "Schedule appointment online or visit branch during off-peak hours",
              time: "10 mins",
              resources: ["https://locators.bankofamerica.com", "https://www.chase.com/digital/resources/privacy-security/security/how-to-bank-online-safely"]
            },
            {
              text: "Bring all required documents in a folder",
              time: "5 mins",
              resources: ["https://www.amazon.com/s?k=document+folder", "https://www.staples.com/folders"]
            },
            {
              text: "Ask questions about fees, overdraft protection, and account features",
              time: "15 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/what-is-overdraft/"]
            },
            {
              text: "Review all paperwork carefully before signing",
              time: "15 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/what-should-i-do-before-opening-a-checking-or-savings-account/"]
            },
            {
              text: "Get copies of all signed documents for your records",
              time: "5 mins",
              resources: ["https://www.investopedia.com/articles/pf/08/record-keeping.asp"]
            },
            {
              text: "Confirm your contact information and mailing address",
              time: "5 mins",
              resources: ["https://www.usps.com/manage/forward.htm"]
            },
            {
              text: "Ask about timeline for debit card arrival and checks",
              time: "5 mins",
              resources: ["https://www.creditcards.com/news/how-long-get-debit-card/"]
            }
          ]
        },
        { 
          id: "bank-5", 
          text: "Set up online banking and mobile app", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Download bank's official mobile app from App Store or Google Play",
              time: "3 mins",
              resources: ["https://apps.apple.com", "https://play.google.com"]
            },
            {
              text: "Visit bank's website and click 'Enroll in Online Banking'",
              time: "5 mins",
              resources: ["https://www.chase.com/digital/online-banking", "https://www.bankofamerica.com/online-banking/"]
            },
            {
              text: "Use account number and personal info to verify identity",
              time: "5 mins",
              resources: ["https://www.fdic.gov/consumers/assistance/protection/idtheft.html"]
            },
            {
              text: "Create strong, unique password and enable two-factor authentication",
              time: "5 mins",
              resources: ["https://www.lastpass.com", "https://1password.com", "https://authy.com"]
            },
            {
              text: "Set up account alerts for low balance, large transactions",
              time: "3 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/how-do-i-set-up-account-alerts/"]
            },
            {
              text: "Explore features: mobile check deposit, bill pay, transfers",
              time: "2 mins",
              resources: ["https://www.nerdwallet.com/article/banking/mobile-check-deposit"]
            },
            {
              text: "Test logging in on both mobile app and computer browser",
              time: "2 mins",
              resources: ["https://www.consumerreports.org/digital-security/online-banking-safety-tips/"]
            }
          ]
        },
        { 
          id: "bank-6", 
          text: "Order and activate your debit card", 
          completed: false,
          timeEstimate: "15 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Ask banker when to expect debit card in mail (usually 7-10 days)",
              time: "2 mins",
              resources: ["https://www.creditcards.com/news/how-long-get-debit-card/"]
            },
            {
              text: "Watch for card arrival and don't let it sit in mailbox",
              time: "1 min",
              resources: ["https://www.usps.com/manage/informed-delivery.htm"]
            },
            {
              text: "Call activation number on sticker when card arrives",
              time: "5 mins",
              resources: ["https://www.investopedia.com/ask/answers/061115/how-do-i-activate-my-debit-card.asp"]
            },
            {
              text: "Follow prompts to set up your 4-digit PIN",
              time: "3 mins",
              resources: ["https://www.nerdwallet.com/article/banking/debit-card-pin-safety"]
            },
            {
              text: "Test card at ATM with small withdrawal to confirm it works",
              time: "2 mins",
              resources: ["https://www.bankrate.com/banking/checking/how-to-use-atm/"]
            },
            {
              text: "Sign the back of your card immediately",
              time: "1 min",
              resources: ["https://www.creditcards.com/news/should-you-sign-your-credit-card/"]
            },
            {
              text: "Add card to mobile wallet (Apple Pay, Google Pay) for security",
              time: "1 min",
              resources: ["https://support.apple.com/en-us/HT204506", "https://support.google.com/pay/answer/7644132"]
            }
          ]
        },
        { 
          id: "bank-7", 
          text: "Set up direct deposit with your employer", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Get direct deposit form from HR or payroll department",
              time: "5 mins",
              resources: ["https://www.adp.com/resources/articles-and-insights/articles/d/direct-deposit.aspx"]
            },
            {
              text: "Provide your bank's routing number and your account number",
              time: "3 mins",
              resources: ["https://www.bankrate.com/banking/checking/how-to-find-routing-number/"]
            },
            {
              text: "Choose what percentage or amount to deposit (usually 100%)",
              time: "2 mins",
              resources: ["https://www.thebalance.com/direct-deposit-split-between-accounts-315738"]
            },
            {
              text: "Submit form and ask when direct deposit will begin",
              time: "3 mins",
              resources: ["https://www.nerdwallet.com/article/banking/direct-deposit"]
            },
            {
              text: "Keep depositing paychecks normally until direct deposit starts",
              time: "2 mins",
              resources: ["https://www.investopedia.com/articles/personal-finance/082914/pros-and-cons-direct-deposit.asp"]
            },
            {
              text: "Verify first direct deposit amount matches your expected pay",
              time: "3 mins",
              resources: ["https://www.mint.com", "https://www.bankrate.com/banking/checking/mobile-banking-apps/"]
            },
            {
              text: "Update any automatic payments to new account once confirmed",
              time: "2 mins",
              resources: ["https://www.nerdwallet.com/article/banking/how-to-change-banks"]
            }
          ]
        },
        { 
          id: "bank-8", 
          text: "Make your first ATM withdrawal without fees", 
          completed: false,
          timeEstimate: "15 mins",
          difficulty: "Easy",
          cost: "Free (using own bank's ATM)",
          microActions: [
            {
              text: "Find your bank's ATM using their mobile app or website locator",
              time: "3 mins",
              resources: ["https://locators.bankofamerica.com", "https://www.chase.com/digital/digital-payments/atm-branch-locator"]
            },
            {
              text: "Check your account balance online before going to ATM",
              time: "2 mins",
              resources: ["https://www.bankrate.com/banking/checking/mobile-banking-apps/"]
            },
            {
              text: "Bring your activated debit card and know your PIN",
              time: "1 min",
              resources: ["https://www.nerdwallet.com/article/banking/debit-card-pin-safety"]
            },
            {
              text: "Use bank's own ATM to avoid fees on your first try",
              time: "3 mins",
              resources: ["https://www.consumerreports.org/banking/how-to-avoid-atm-fees/"]
            },
            {
              text: "Start with small withdrawal amount ($20-40) to test",
              time: "2 mins",
              resources: ["https://www.bankrate.com/banking/checking/how-to-use-atm/"]
            },
            {
              text: "Take receipt and verify transaction appears in your account",
              time: "2 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/how-do-i-get-a-receipt-for-an-atm-transaction/"]
            },
            {
              text: "Locate 2-3 convenient fee-free ATMs near home and work",
              time: "2 mins",
              resources: ["https://www.allpointnetwork.com/locator.html", "https://www.co-opfs.org/Shared-Branching-Locator"]
            }
          ]
        },
      ],
      tips: [
        "Credit unions often offer better rates and lower fees than big banks",
        "Online banks typically offer higher interest rates on savings",
        "Always read the fine print about fees and minimum balances",
        "Set up account alerts to avoid overdraft fees",
        "Keep your account information secure and monitor regularly for fraud"
      ],
      icon: Wallet,
    },
    {
      title: "Budget That Actually Works (50/30/20 + envelopes)",
      summary: "Pick a method, set it up, and stick to it without stress.",
      difficulty: "Beginner", 
      duration: "30 min",
      description: "Create a sustainable budget using the proven 50/30/20 method. Track your spending, save automatically, and take control of your financial future.",
      steps: [
        "Calculate your monthly after-tax income from all sources",
        "Track your spending for one week to understand current habits",
        "List all fixed expenses (rent, insurance, minimum debt payments)",
        "Categorize remaining expenses into needs vs wants",
        "Apply 50/30/20 rule: 50% needs, 30% wants, 20% savings/debt",
        "Set up automatic transfers to savings accounts",
        "Choose a tracking method: app, spreadsheet, or envelope system",
        "Create specific budget categories that work for your lifestyle",
        "Set up monthly money dates to review and adjust",
        "Build in flexibility for unexpected expenses",
        "Automate as much as possible to reduce decision fatigue",
        "Track progress toward financial goals monthly"
      ],
      tasks: [
        { 
          id: "budget-1", 
          text: "Calculate your exact monthly after-tax income", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Gather your last 3 pay stubs or direct deposit records",
              time: "5 mins",
              resources: ["https://www.adp.com", "https://www.paychex.com"]
            },
            {
              text: "Calculate average monthly take-home pay",
              time: "5 mins",
              resources: ["https://www.calculator.net", "https://sheets.google.com"]
            },
            {
              text: "Add any side income, freelance work, or benefits",
              time: "5 mins",
              resources: ["https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center"]
            },
            {
              text: "Subtract any pre-tax deductions not already removed",
              time: "3 mins",
              resources: ["https://www.investopedia.com/terms/p/pre-tax-deduction.asp"]
            },
            {
              text: "Write down your final monthly after-tax income",
              time: "2 mins",
              resources: ["https://sheets.google.com", "https://www.mint.com"]
            }
          ]
        },
        { 
          id: "budget-2", 
          text: "Track all expenses for one full week", 
          completed: false,
          timeEstimate: "2 mins daily for 7 days",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Download expense tracking app or create spreadsheet",
              time: "10 mins",
              resources: ["https://www.mint.com", "https://www.ynab.com", "https://sheets.google.com", "https://www.pocketguard.com"]
            },
            {
              text: "Record every purchase immediately after making it",
              time: "1-2 mins per transaction",
              resources: ["https://www.expensify.com", "https://www.spendee.com"]
            },
            {
              text: "Include cash, card, and digital payments",
              time: "30 seconds per transaction",
              resources: ["https://www.venmo.com", "https://www.paypal.com", "https://cash.app"]
            },
            {
              text: "Categorize expenses: needs, wants, savings",
              time: "5 mins daily",
              resources: ["https://www.nerdwallet.com/article/finance/how-to-budget"]
            },
            {
              text: "Review and analyze spending patterns at week's end",
              time: "15 mins",
              resources: ["https://www.mint.com/how-mint-works/", "https://www.personalcapital.com"]
            }
          ]
        },
        { 
          id: "budget-3", 
          text: "Create your 50/30/20 budget breakdown", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Calculate 50% of income for needs (rent, utilities, groceries)",
              time: "5 mins",
              resources: ["https://www.calculator.net", "https://sheets.google.com"]
            },
            {
              text: "Calculate 30% of income for wants (entertainment, dining out)",
              time: "5 mins",
              resources: ["https://www.nerdwallet.com/article/finance/nerdwallet-budget-calculator"]
            },
            {
              text: "Calculate 20% of income for savings and debt payments",
              time: "5 mins",
              resources: ["https://www.investopedia.com/terms/r/rule-of-20.asp"]
            },
            {
              text: "List your actual expenses in each category",
              time: "10 mins",
              resources: ["https://www.mint.com", "https://sheets.google.com"]
            },
            {
              text: "Identify areas where you're overspending",
              time: "3 mins",
              resources: ["https://www.ynab.com/learn"]
            },
            {
              text: "Make adjustments to fit the 50/30/20 framework",
              time: "2 mins",
              resources: ["https://www.bankrate.com/personal-finance/smart-money/50-30-20-rule-budget/"]
            }
          ]
        },
        { 
          id: "budget-4", 
          text: "Set up automatic savings transfers", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Open a separate high-yield savings account if needed",
              time: "10 mins",
              resources: ["https://www.nerdwallet.com/banking/savings-accounts", "https://www.ally.com", "https://www.marcus.com"]
            },
            {
              text: "Calculate your target monthly savings amount (20% of income)",
              time: "3 mins",
              resources: ["https://www.calculator.net"]
            },
            {
              text: "Log into your checking account online banking",
              time: "3 mins",
              resources: ["https://www.chase.com", "https://www.bankofamerica.com"]
            },
            {
              text: "Set up automatic transfer for day after payday",
              time: "5 mins",
              resources: ["https://www.bankrate.com/banking/savings/how-to-automate-your-savings/"]
            },
            {
              text: "Start with smaller amount and increase gradually",
              time: "2 mins",
              resources: ["https://www.nerdwallet.com/article/banking/how-to-save-money"]
            },
            {
              text: "Confirm first transfer is scheduled correctly",
              time: "2 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/what-should-i-know-about-automatic-bill-payment/"]
            }
          ]
        },
        { 
          id: "budget-5", 
          text: "Choose and set up your preferred tracking method", 
          completed: false,
          timeEstimate: "40 mins",
          difficulty: "Easy",
          cost: "Free or $5-15/month for premium apps",
          microActions: [
            {
              text: "Research budget tracking options: apps vs spreadsheets",
              time: "10 mins",
              resources: ["https://www.nerdwallet.com/article/finance/best-budget-apps", "https://www.mint.com", "https://www.ynab.com"]
            },
            {
              text: "Download and test 2-3 free budgeting apps",
              time: "15 mins",
              resources: ["https://apps.apple.com", "https://play.google.com", "https://www.pocketguard.com"]
            },
            {
              text: "Set up chosen app with your bank account connections",
              time: "10 mins",
              resources: ["https://www.mint.com/how-mint-works/", "https://www.personalcapital.com"]
            },
            {
              text: "Create budget categories that match your spending",
              time: "3 mins",
              resources: ["https://www.everydollar.com"]
            },
            {
              text: "Set up spending alerts and notifications",
              time: "2 mins",
              resources: ["https://www.mint.com/mint-mobile-app"]
            }
          ]
        },
        { 
          id: "budget-6", 
          text: "Follow your budget for one full month", 
          completed: false,
          timeEstimate: "5 mins daily for 30 days",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Check your budget daily for first week",
              time: "3 mins daily",
              resources: ["https://www.mint.com", "https://www.ynab.com"]
            },
            {
              text: "Track every expense immediately after purchase",
              time: "1 min per transaction",
              resources: ["https://www.expensify.com", "https://www.spendee.com"]
            },
            {
              text: "Review weekly spending vs budget targets",
              time: "10 mins weekly",
              resources: ["https://sheets.google.com", "https://www.personalcapital.com"]
            },
            {
              text: "Adjust spending when approaching category limits",
              time: "2 mins as needed",
              resources: ["https://www.mint.com/mint-mobile-app"]
            },
            {
              text: "Celebrate small wins and learn from overspending",
              time: "5 mins weekly",
              resources: ["https://www.ynab.com/learn"]
            },
            {
              text: "Analyze full month results and plan improvements",
              time: "20 mins",
              resources: ["https://www.nerdwallet.com/article/finance/how-to-budget"]
            }
          ]
        },
        { 
          id: "budget-7", 
          text: "Complete your first monthly budget review", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Download expense data from your bank and credit cards",
              time: "10 mins",
              resources: ["https://www.chase.com", "https://www.bankofamerica.com", "https://www.mint.com"]
            },
            {
              text: "Compare actual spending to your planned budget categories",
              time: "10 mins",
              resources: ["https://sheets.google.com", "https://www.ynab.com"]
            },
            {
              text: "Identify categories where you overspent or underspent",
              time: "5 mins",
              resources: ["https://www.nerdwallet.com/article/finance/how-to-budget"]
            },
            {
              text: "Calculate how much you saved vs your savings goal",
              time: "3 mins",
              resources: ["https://www.calculator.net"]
            },
            {
              text: "Write down 3 lessons learned for next month",
              time: "2 mins",
              resources: ["https://docs.google.com", "https://www.evernote.com"]
            }
          ]
        },
        { 
          id: "budget-8", 
          text: "Adjust and improve your budget for month two", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Adjust budget amounts based on month 1 actual spending",
              time: "10 mins",
              resources: ["https://www.mint.com", "https://www.ynab.com"]
            },
            {
              text: "Add any new expense categories you discovered",
              time: "5 mins",
              resources: ["https://www.nerdwallet.com/article/finance/how-to-budget"]
            },
            {
              text: "Set up alerts for categories where you overspent",
              time: "5 mins",
              resources: ["https://www.mint.com/mint-mobile-app", "https://www.personalcapital.com"]
            },
            {
              text: "Plan specific strategies to reduce problem spending areas",
              time: "3 mins",
              resources: ["https://www.daveramsey.com/blog/budgeting-tips"]
            },
            {
              text: "Commit to tracking more closely in month 2",
              time: "2 mins",
              resources: ["https://www.expensify.com", "https://www.spendee.com"]
            }
          ]
        }
      ],
      tips: [
        "Start with tracking before restricting - knowledge is power",
        "Automate savings first, then spend what's left",
        "Use the 'pay yourself first' principle",
        "Budget for fun money to avoid feeling deprived",
        "Review and adjust monthly - your budget should evolve with your life"
      ],
      icon: BookOpen,
    },
    {
      title: "Understanding Your Credit Score",
      summary: "What affects it, how to check it for free, and simple ways to improve it.",
      difficulty: "Intermediate",
      duration: "25 min",
      description: "Master the credit system to unlock better rates on loans, credit cards, and even rental applications. Build excellent credit from day one.",
      steps: [
        "Check your credit score for free using Credit Karma, Credit Sesame, or your bank",
        "Request your free annual credit report from annualcreditreport.com",
        "Review your credit report for errors or fraudulent accounts",
        "Understand the five factors: payment history (35%), credit utilization (30%), length of history (15%), new credit (10%), credit mix (10%)",
        "Set up automatic payments for all bills to ensure on-time payments",
        "Keep credit utilization below 30% (ideally under 10%)",
        "Don't close old credit cards unless they have annual fees",
        "Be strategic about new credit applications",
        "Consider becoming an authorized user on a family member's card",
        "Monitor your credit regularly and set up fraud alerts",
        "Dispute any errors on your credit report immediately",
        "Be patient - good credit takes time to build"
      ],
      tasks: [
        { 
          id: "credit-1", 
          text: "Check your credit score from a free source", 
          completed: false,
          timeEstimate: "15 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Visit Credit Karma, Credit Sesame, or AnnualCreditReport.com",
              time: "5 mins",
              resources: ["https://www.creditkarma.com", "https://www.creditsesame.com", "https://www.annualcreditreport.com"]
            },
            {
              text: "Create account with your personal information",
              time: "5 mins",
              resources: ["https://www.consumer.ftc.gov/articles/free-credit-reports"]
            },
            {
              text: "View your credit score and note the range (300-850)",
              time: "3 mins",
              resources: ["https://www.experian.com/blogs/ask-experian/credit-education/score-basics/what-is-a-good-credit-score/"]
            },
            {
              text: "Screenshot or write down your score for tracking",
              time: "2 mins",
              resources: ["https://sheets.google.com", "https://www.mint.com"]
            }
          ]
        },
        { 
          id: "credit-2", 
          text: "Download and review your full credit report", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Go to AnnualCreditReport.com (official government site)",
              time: "3 mins",
              resources: ["https://www.annualcreditreport.com"]
            },
            {
              text: "Request reports from Experian, Equifax, and TransUnion",
              time: "10 mins",
              resources: ["https://www.consumer.ftc.gov/articles/free-credit-reports"]
            },
            {
              text: "Download and save all three reports as PDFs",
              time: "5 mins",
              resources: ["https://www.google.com/drive", "https://www.dropbox.com"]
            },
            {
              text: "Review personal information for accuracy",
              time: "5 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report/"]
            },
            {
              text: "Check all accounts and payment history",
              time: "5 mins",
              resources: ["https://www.experian.com/blogs/ask-experian/how-to-read-credit-report/"]
            },
            {
              text: "Look for errors, unknown accounts, or fraud",
              time: "2 mins",
              resources: ["https://www.identitytheft.gov"]
            }
          ]
        },
        { 
          id: "credit-3", 
          text: "Set up automatic payments for all bills", 
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "List all monthly bills: rent, utilities, phone, credit cards",
              time: "10 mins",
              resources: ["https://www.mint.com", "https://sheets.google.com"]
            },
            {
              text: "Log into each account's website or app",
              time: "15 mins",
              resources: ["https://www.lastpass.com", "https://1password.com"]
            },
            {
              text: "Set up automatic payments for at least minimum amounts",
              time: "15 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/what-should-i-know-about-automatic-bill-payment/"]
            },
            {
              text: "Choose payment dates that align with your pay schedule",
              time: "3 mins",
              resources: ["https://www.nerdwallet.com/article/finance/automatic-bill-pay"]
            },
            {
              text: "Confirm automatic payments are set up correctly",
              time: "2 mins",
              resources: ["https://www.consumerreports.org/banking/automatic-bill-pay-pros-and-cons/"]
            }
          ]
        },
        { 
          id: "credit-4", 
          text: "Calculate your current credit utilization ratio", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "List all credit cards and their current balances",
              time: "5 mins",
              resources: ["https://www.mint.com", "https://sheets.google.com"]
            },
            {
              text: "Find the credit limit for each card",
              time: "5 mins",
              resources: ["https://www.creditcards.com/credit-card-news/help/check-credit-limit-6000/"]
            },
            {
              text: "Calculate utilization: (total balances ÷ total limits) × 100",
              time: "5 mins",
              resources: ["https://www.calculator.net", "https://www.creditkarma.com/advice/i/credit-utilization-calculator"]
            },
            {
              text: "Aim for under 30% utilization, ideally under 10%",
              time: "3 mins",
              resources: ["https://www.experian.com/blogs/ask-experian/what-is-credit-utilization/"]
            },
            {
              text: "Create plan to pay down high-utilization cards first",
              time: "2 mins",
              resources: ["https://www.nerdwallet.com/article/credit-cards/credit-utilization-ratio"]
            }
          ]
        },
        { 
          id: "credit-5", 
          text: "Set up credit monitoring alerts", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Sign up for Credit Karma or Credit Sesame alerts",
              time: "10 mins",
              resources: ["https://www.creditkarma.com", "https://www.creditsesame.com"]
            },
            {
              text: "Enable alerts from all three credit bureaus",
              time: "10 mins",
              resources: ["https://www.experian.com/fraud-alerts/", "https://www.equifax.com/personal/credit-report-services/", "https://www.transunion.com/fraud-alerts"]
            },
            {
              text: "Set up account alerts with your credit card companies",
              time: "3 mins",
              resources: ["https://www.creditcards.com/news/credit-card-account-alerts/"]
            },
            {
              text: "Test alerts by making a small purchase",
              time: "2 mins",
              resources: ["https://www.consumer.ftc.gov/articles/free-credit-reports"]
            }
          ]
        },
        { 
          id: "credit-6", 
          text: "Dispute any errors found on your credit report", 
          completed: false,
          timeEstimate: "1 hour",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Document all errors with screenshots and notes",
              time: "15 mins",
              resources: ["https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report/"]
            },
            {
              text: "Contact credit bureau online or by mail",
              time: "20 mins",
              resources: ["https://www.experian.com/disputes/", "https://www.equifax.com/personal/credit-report-services/credit-dispute/", "https://www.transunion.com/credit-disputes"]
            },
            {
              text: "Provide detailed explanation and supporting documents",
              time: "15 mins",
              resources: ["https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/fair-credit-reporting-act"]
            },
            {
              text: "Keep copies of all correspondence",
              time: "5 mins",
              resources: ["https://www.google.com/drive", "https://www.dropbox.com"]
            },
            {
              text: "Follow up in 30 days if no response",
              time: "5 mins",
              resources: ["https://calendar.google.com", "https://www.consumerfinance.gov/complaint/"]
            }
          ]
        },
        { 
          id: "credit-7", 
          text: "Create a strategy to improve your weakest credit factor", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Identify your lowest credit score factor",
              time: "5 mins",
              resources: ["https://www.creditkarma.com", "https://www.experian.com/blogs/ask-experian/credit-education/score-basics/"]
            },
            {
              text: "Research strategies for your specific weakness",
              time: "15 mins",
              resources: ["https://www.nerdwallet.com/article/finance/how-to-build-credit", "https://www.creditcards.com/credit-card-news/help/improve-credit-score-6000/"]
            },
            {
              text: "Create 90-day action plan with specific steps",
              time: "8 mins",
              resources: ["https://sheets.google.com", "https://www.todoist.com"]
            },
            {
              text: "Set monthly reminders to track progress",
              time: "2 mins",
              resources: ["https://calendar.google.com", "https://www.creditkarma.com"]
            }
          ]
        },
        { id: "credit-8", text: "Check your score improvement after 3 months", completed: false }
      ],
      tips: [
        "Never pay for credit score monitoring - many free options exist",
        "Paying off credit cards multiple times per month can lower utilization",
        "Student loans and auto loans help build credit mix",
        "Ask for credit limit increases annually to improve utilization ratio",
        "Even one late payment can significantly hurt your score"
      ],
      icon: ShieldCheck,
    },
    {
      title: "Filing Your First Tax Return",
      summary: "Step-by-step guide to filing taxes, from W-2s to refunds.",
      difficulty: "Intermediate",
      duration: "45 min",
      description: "Navigate tax season with confidence. Learn to file accurately, maximize deductions, and get your refund quickly and safely.",
      steps: [
        "Gather all tax documents: W-2s, 1099s, receipts for deductions",
        "Choose your filing method: free software, paid software, or professional",
        "Determine if you should itemize deductions or take the standard deduction",
        "Report all income sources accurately",
        "Claim all eligible deductions and credits",
        "Double-check all numbers and personal information",
        "Choose direct deposit for faster refund processing",
        "File electronically for quicker processing and confirmation",
        "Keep copies of all tax documents and filed returns",
        "Set up a system for tracking next year's deductible expenses",
        "Consider quarterly estimated payments if you're self-employed",
        "Plan ahead for next year's tax situation"
      ],
      tasks: [
        { 
          id: "tax-1", 
          text: "Collect all tax documents (W-2s, 1099s, receipts)", 
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Download W-2 from employer payroll system",
              time: "10 mins",
              resources: ["https://www.adp.com", "https://www.paychex.com", "https://workday.com"]
            },
            {
              text: "Gather 1099 forms from banks, investment accounts, gig work",
              time: "15 mins",
              resources: ["https://www.irs.gov/forms-pubs/about-form-1099-misc", "https://turbotax.intuit.com/tax-tips/"]
            },
            {
              text: "Collect receipts for deductible expenses (education, charity, medical)",
              time: "15 mins",
              resources: ["https://www.irs.gov/publications/p529", "https://www.nerdwallet.com/article/taxes/tax-deductions-credits"]
            },
            {
              text: "Check for missing documents and contact issuers if needed",
              time: "3 mins",
              resources: ["https://www.irs.gov/newsroom/missing-tax-documents"]
            },
            {
              text: "Organize documents in clearly labeled folder",
              time: "2 mins",
              resources: ["https://www.google.com/drive", "https://www.dropbox.com"]
            }
          ]
        },
        { 
          id: "tax-2", 
          text: "Choose appropriate tax filing software or service", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Easy",
          cost: "Free to $200+ depending on complexity",
          microActions: [
            {
              text: "Assess complexity: simple W-2 only vs multiple income sources",
              time: "5 mins",
              resources: ["https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free"]
            },
            {
              text: "Compare free options: IRS Free File, Credit Karma Tax",
              time: "10 mins",
              resources: ["https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free", "https://www.creditkarma.com/tax"]
            },
            {
              text: "Research paid options: TurboTax, H&R Block, TaxAct",
              time: "10 mins",
              resources: ["https://turbotax.intuit.com", "https://www.hrblock.com", "https://www.taxact.com"]
            },
            {
              text: "Read reviews and compare pricing for your situation",
              time: "3 mins",
              resources: ["https://www.nerdwallet.com/article/taxes/best-tax-software"]
            },
            {
              text: "Create account with chosen service",
              time: "2 mins",
              resources: ["https://turbotax.intuit.com", "https://www.creditkarma.com"]
            }
          ]
        },
        { 
          id: "tax-3", 
          text: "Complete your federal tax return", 
          completed: false,
          microActions: [
            { text: "Sign in or create an account in your chosen tax software", time: "3 mins", resources: ["https://turbotax.intuit.com", "https://www.hrblock.com", "https://www.creditkarma.com/tax"] },
            { text: "Enter personal information (name, SSN, address)", time: "5 mins", resources: ["https://www.irs.gov/individuals"] },
            { text: "Import or enter W-2 information", time: "10 mins", resources: ["https://www.irs.gov/forms-pubs/about-form-w-2"] },
            { text: "Report all income (W-2s, 1099s, interest/dividends)", time: "10 mins", resources: ["https://www.irs.gov/forms-instructions"] },
            { text: "Answer questions for deductions/credits (education, EITC, CTC)", time: "10 mins", resources: ["https://www.irs.gov/credits-deductions-for-individuals"] },
            { text: "Run the software’s error check and address any flags", time: "5 mins" }
          ]
        },
        { 
          id: "tax-4", 
          text: "Complete your state tax return (if required)", 
          completed: false,
          microActions: [
            { text: "Confirm residency/part-year/nonresident status", time: "3 mins" },
            { text: "Import state return from federal data (most software prompts)", time: "2 mins" },
            { text: "Add state-specific deductions/credits (529, renter’s credit, etc.)", time: "8 mins" },
            { text: "Check city/local taxes if your state requires it", time: "3 mins" }
          ]
        },
        { 
          id: "tax-5", 
          text: "Review returns for accuracy before filing", 
          completed: false,
          microActions: [
            { text: "Verify names, SSNs, and address match your documents", time: "2 mins" },
            { text: "Confirm refund/amount owed looks reasonable vs last year", time: "3 mins" },
            { text: "Verify bank routing & account numbers for direct deposit", time: "2 mins" },
            { text: "Download/print draft PDF and skim for typos", time: "5 mins" }
          ]
        },
        { 
          id: "tax-6", 
          text: "File taxes electronically with direct deposit setup", 
          completed: false,
          microActions: [
            { text: "Choose e-file option in your software", time: "1 min" },
            { text: "Enter routing and account numbers for refund deposit", time: "2 mins" },
            { text: "Submit return and save the confirmation screen", time: "2 mins" }
          ]
        },
        { 
          id: "tax-7", 
          text: "Save copies of filed returns and supporting documents", 
          completed: false,
          microActions: [
            { text: "Save PDFs of federal/state returns to cloud storage", time: "3 mins", resources: ["https://drive.google.com", "https://www.dropbox.com"] },
            { text: "Store confirmation numbers and filing receipts", time: "2 mins" },
            { text: "Backup to a second location (external drive or secondary cloud)", time: "3 mins" }
          ]
        },
        { 
          id: "tax-8", 
          text: "Set up system for tracking next year's tax information", 
          completed: false,
          microActions: [
            { text: "Create a receipts folder (digital and/or physical)", time: "3 mins" },
            { text: "Set quarterly reminders if self-employed for estimated taxes", time: "2 mins", resources: ["https://www.irs.gov/businesses/small-businesses-self-employed/estimated-taxes"] },
            { text: "Update your W-4 if refund was large or you owed a lot", time: "5 mins", resources: ["https://www.irs.gov/forms-pubs/about-form-w-4"] },
            { text: "Add a calendar reminder for next tax season start (late Jan)", time: "1 min" }
          ]
        }
      ],
      tips: [
        "File as early as possible to get your refund sooner and reduce fraud risk",
        "Never pay for 'rapid refunds' - direct deposit is fast and free",
        "Keep tax records for at least 3 years (7 if you're self-employed)",
        "Consider contributing to retirement accounts to reduce taxable income",
        "If you owe money, file on time even if you can't pay immediately"
      ],
      icon: Calendar,
    },
    {
      title: "Build a $1,000 Emergency Fund (30 Days)",
      summary: "Rapid plan to create your first safety cushion.",
      difficulty: "Beginner",
      duration: "30 min setup",
      description: "Follow a simple 4‑step plan to quickly build your first $1,000 emergency fund and protect yourself from surprise expenses.",
      steps: [
        "Open a separate high‑yield savings account",
        "Add automatic weekly transfers",
        "Cut 2–3 small expenses temporarily",
        "Sell one unused item for a cash boost",
        "Celebrate milestones at $250/$500/$1,000"
      ],
      tasks: [
        { id: "efund-1", text: "Open a high‑yield savings account", completed: false },
        { id: "efund-2", text: "Schedule $25–$50 weekly auto‑transfer", completed: false },
        { id: "efund-3", text: "List 3 expenses to pause for 30 days", completed: false },
        { id: "efund-4", text: "List one item to sell and post it", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "High‑Yield Savings Setup (5% APY Basics)",
      summary: "Find, open, and fund a HYSA the right way.",
      difficulty: "Beginner",
      duration: "15 min",
      description: "Choose a trusted HYSA, understand transfer limits, and avoid common pitfalls.",
      steps: [
        "Compare APYs and transfer times",
        "Link checking for instant transfers",
        "Turn on balance and deposit alerts",
        "Nickname account 'Emergency Fund' to avoid spending"
      ],
      tasks: [
        { id: "hysa-1", text: "Compare 3 HYSA providers and pick one", completed: false },
        { id: "hysa-2", text: "Link checking via micro‑deposits", completed: false },
        { id: "hysa-3", text: "Enable alerts for deposits/low balance", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "Beginner Investing with Index Funds",
      summary: "Set up long‑term investing in under an hour.",
      difficulty: "Intermediate",
      duration: "40 min",
      description: "Open a brokerage, choose a diversified index fund, and automate contributions.",
      steps: [
        "Open brokerage (or use existing 401k/IRA)",
        "Pick a broad market index fund",
        "Set monthly auto‑invest",
        "Disable frequent trading notifications"
      ],
      tasks: [
        { id: "invest-1", text: "Open or log into a brokerage/IRA", completed: false },
        { id: "invest-2", text: "Choose one diversified index fund (e.g., total market)", completed: false },
        { id: "invest-3", text: "Schedule monthly auto‑invest", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "Create a Debt Payoff Plan (Snowball/Avalanche)",
      summary: "Pick a method and schedule payments.",
      difficulty: "Intermediate",
      duration: "35 min",
      description: "List debts, choose snowball or avalanche, and automate extra payments.",
      steps: [
        "List all debts with APR and minimums",
        "Choose snowball (smallest balance) or avalanche (highest APR)",
        "Automate minimums + one extra target payment",
        "Track progress monthly"
      ],
      tasks: [
        { id: "debt-1", text: "Create a debt spreadsheet with APRs", completed: false },
        { id: "debt-2", text: "Pick snowball or avalanche method", completed: false },
        { id: "debt-3", text: "Schedule one extra payment toward target debt", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "Build Credit with a Secured Card (Start Smart)",
      summary: "Get approved, use lightly, pay in full.",
      difficulty: "Beginner",
      duration: "20 min",
      description: "Open a secured card, keep utilization under 10%, and pay on time to grow credit.",
      steps: [
        "Compare secured cards with low fees",
        "Deposit amount and activate",
        "Use for one recurring bill",
        "Autopay statement in full"
      ],
      tasks: [
        { id: "secured-1", text: "Apply for a secured card (low fee)", completed: false },
        { id: "secured-2", text: "Add one small monthly subscription to card", completed: false },
        { id: "secured-3", text: "Enable autopay statement balance", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "Insurance Basics: Auto, Renters, Health",
      summary: "Pick coverage that protects without overpaying.",
      difficulty: "Beginner",
      duration: "45 min",
      description: "Understand deductibles, limits, and when each policy matters.",
      steps: [
        "List what you must insure (car, apartment, health)",
        "Get 3 quotes for auto and renters",
        "Check health network & preventive care",
        "Raise deductible to lower premium (if EFund exists)"
      ],
      tasks: [
        { id: "ins-1", text: "Get 3 auto insurance quotes", completed: false },
        { id: "ins-2", text: "Get 3 renters insurance quotes", completed: false },
        { id: "ins-3", text: "Verify doctor network on your health plan", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "Negotiate Bills & Subscriptions (Save $50/mo)",
      summary: "Call scripts + cancellations in 20 minutes.",
      difficulty: "Beginner",
      duration: "25 min",
      description: "Lower internet, phone, and streaming costs with simple negotiation scripts.",
      steps: [
        "List monthly bills and renewal dates",
        "Use a negotiation script for internet/phone",
        "Cancel or pause unused subscriptions",
        "Set calendar to revisit in 6 months"
      ],
      tasks: [
        { id: "neg-1", text: "Call provider and ask for promo rate", completed: false },
        { id: "neg-2", text: "Cancel 1–2 unused subscriptions", completed: false },
        { id: "neg-3", text: "Set 6‑month reminder to re‑check rates", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "Paycheck 101: Read Your Stub & Withholding",
      summary: "Understand taxes, benefits, and net pay.",
      difficulty: "Beginner",
      duration: "20 min",
      description: "Learn what each line on your paystub means and adjust your W‑4 confidently.",
      steps: [
        "Identify gross vs net pay",
        "Review federal/state taxes, FICA",
        "Check benefits deductions",
        "Adjust W‑4 if refund/owed is large"
      ],
      tasks: [
        { id: "pay-1", text: "Open latest paystub and highlight each section", completed: false },
        { id: "pay-2", text: "Estimate annual net income", completed: false },
        { id: "pay-3", text: "Review W‑4 and adjust if needed", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "Side Hustle Setup (Weekend Plan)",
      summary: "Find one legit gig and get paid safely.",
      difficulty: "Beginner",
      duration: "40 min",
      description: "Pick a simple side gig, set up payouts, and keep taxes clean.",
      steps: [
        "Choose one platform (e.g., tutoring, deliveries)",
        "Create profile and verify ID",
        "Set payout to checking",
        "Track income/expenses for taxes"
      ],
      tasks: [
        { id: "side-1", text: "Pick a platform and create profile", completed: false },
        { id: "side-2", text: "Complete ID verification and payout setup", completed: false },
        { id: "side-3", text: "Log first 3 gigs and income", completed: false }
      ],
      icon: Wallet
    },
    {
      title: "Move‑Out Budget & Deposits Planner",
      summary: "Know true costs before you sign.",
      difficulty: "Beginner",
      duration: "30 min",
      description: "Estimate deposits, setup fees, and furnishing basics so you don’t get surprised.",
      steps: [
        "List one‑time costs (deposits, application, movers)",
        "List monthly costs (rent, utilities, internet)",
        "Create a move‑in savings target",
        "Set timeline with weekly contributions"
      ],
      tasks: [
        { id: "move-1", text: "Create a move‑out cost checklist", completed: false },
        { id: "move-2", text: "Set a savings goal and timeline", completed: false },
        { id: "move-3", text: "Open a dedicated 'Move' savings bucket", completed: false }
      ]
    },
    {
      title: "Student Loans 101 (FAFSA to Payments)",
      summary: "Basics of aid, interest, and repayment plans.",
      difficulty: "Intermediate",
      duration: "35 min",
      description: "Understand aid types, complete FAFSA, and pick a realistic repayment plan.",
      steps: [
        "Complete FAFSA and review award types",
        "Know subsidized vs unsubsidized",
        "Track servicer and interest rates",
        "Pick repayment plan and set autopay"
      ],
      tasks: [
        { id: "loan-1", text: "Submit FAFSA or verify current year filed", completed: false },
        { id: "loan-2", text: "List loan servicers and interest rates", completed: false },
        { id: "loan-3", text: "Enable autopay for interest reduction", completed: false }
      ],
      icon: Wallet
    }
  ],
  "health": [
  {
    title: "Your First Doctor Appointment: A Simple Checklist",
    summary: "Find a PCP, what to say, forms you'll complete, and follow-ups.",
      difficulty: "Beginner",
      duration: "20 min",
      description: "Navigate your first adult doctor visit with confidence. Learn to find the right primary care physician, prepare for appointments, and build a lasting healthcare relationship.",
      steps: [
        "Research primary care doctors in your area using insurance provider directory",
        "Check doctor reviews on Healthgrades, Zocdoc, or Google Reviews",
        "Verify the doctor accepts your insurance and is accepting new patients",
        "Call the office to schedule a new patient appointment",
        "Gather your medical history including previous doctors, medications, allergies",
        "Compile a list of current symptoms or health concerns to discuss",
        "Prepare a list of questions about preventive care and screenings",
        "Arrive 15 minutes early to complete new patient paperwork",
        "Bring your insurance card, ID, and payment method for copay",
        "Be honest about your health history, lifestyle, and concerns",
        "Ask about recommended screenings for your age and health status",
        "Schedule any follow-up appointments or tests before leaving",
        "Save the office contact information and portal access details",
        "Follow up on any test results or referrals as instructed"
      ],
      tasks: [
        { 
          id: "doctor-1", 
          text: "Research and choose 3 potential primary care doctors", 
          completed: false,
          timeEstimate: "1 hour",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Check your insurance provider directory online",
              time: "15 mins",
              resources: ["https://www.bcbs.com/find-doctor", "https://www.anthem.com/find-care", "https://www.unitedhealthcare.com/find-a-doctor"]
            },
            {
              text: "Search on Healthgrades.com and Zocdoc.com for ratings",
              time: "20 mins",
              resources: ["https://www.healthgrades.com", "https://www.zocdoc.com", "https://www.vitals.com"]
            },
            {
              text: "Check Google Reviews and read patient experiences",
              time: "15 mins",
              resources: ["https://www.google.com/maps", "https://www.yelp.com/c/health"]
            },
            {
              text: "Call 3 offices to verify insurance and new patient availability",
              time: "10 mins",
              resources: ["https://www.cms.gov/files/document/provider-screening-checklist.pdf"]
            }
          ]
        },
        { 
          id: "doctor-2", 
          text: "Verify insurance coverage and call to schedule appointment", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Call insurance to confirm doctor is in-network",
              time: "5 mins",
              resources: ["https://www.healthcare.gov/glossary/provider/"]
            },
            {
              text: "Ask about copay amount for office visits",
              time: "3 mins",
              resources: ["https://www.healthcare.gov/glossary/co-payment/"]
            },
            {
              text: "Call doctor's office during business hours to schedule",
              time: "5 mins",
              resources: ["https://www.zocdoc.com", "https://www.mychart.org"]
            },
            {
              text: "Provide insurance information and personal details",
              time: "5 mins",
              resources: ["https://www.healthcare.gov/glossary/member-id/"]
            },
            {
              text: "Add appointment to your calendar with office address",
              time: "2 mins",
              resources: ["https://calendar.google.com", "https://outlook.live.com"]
            }
          ]
        }
      ],
      tips: [
        "New patient appointments are typically longer - allow extra time",
        "Write down questions beforehand - it's easy to forget during the visit",
        "Bring a list of all medications, including vitamins and supplements",
        "Don't be embarrassed about any health concerns - doctors have seen it all",
        "Ask about patient portal access for easy communication and test results"
      ],
    icon: Stethoscope,
  },
    {
      title: "Understanding Health Insurance Basics",
      summary: "Deductibles, copays, networks, and how to use your benefits.",
      difficulty: "Intermediate",
      duration: "30 min",
      description: "Master health insurance to save money and get the care you need. Understand key terms, find providers, and maximize your benefits.",
      steps: [
        "Review your insurance card and identify key information (member ID, group number)",
        "Log into your insurance company's website or app to access your benefits",
        "Understand your plan type: HMO, PPO, EPO, or HDHP with HSA",
        "Learn key terms: premium, deductible, copay, coinsurance, out-of-pocket max",
        "Find your plan's provider directory to locate in-network doctors",
        "Understand which services require prior authorization",
        "Learn about preventive care benefits (usually covered 100%)",
        "Understand urgent care vs emergency room coverage and costs",
        "Know how to file claims if required for out-of-network services",
        "Set up automatic payments for premiums if through employer",
        "Understand prescription drug coverage and formulary",
        "Know your plan's customer service number for questions"
      ],
      tasks: [
        { 
          id: "insurance-1", 
          text: "Create account on insurance company website/app", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Find your insurance card with member ID and group number",
              time: "3 mins",
              resources: ["https://www.healthcare.gov/glossary/member-id/"]
            },
            {
              text: "Visit your insurance company's website",
              time: "2 mins",
              resources: ["https://www.bcbs.com", "https://www.anthem.com", "https://www.unitedhealthcare.com", "https://www.aetna.com"]
            },
            {
              text: "Click 'Register' or 'Create Account' and follow prompts",
              time: "10 mins",
              resources: ["https://www.healthcare.gov/glossary/member-id/"]
            },
            {
              text: "Download the mobile app and log in",
              time: "3 mins",
              resources: ["https://apps.apple.com", "https://play.google.com"]
            },
            {
              text: "Verify your personal information is correct",
              time: "2 mins",
              resources: ["https://www.cms.gov/about-cms/contact-us"]
            }
          ]
        },
        { 
          id: "insurance-2", 
          text: "Download and review your full benefits summary", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Log into your insurance account online",
              time: "3 mins",
              resources: ["https://www.bcbs.com", "https://www.anthem.com"]
            },
            {
              text: "Find and download 'Benefits Summary' or 'Plan Document'",
              time: "5 mins",
              resources: ["https://www.healthcare.gov/glossary/summary-of-benefits-and-coverage/"]
            },
            {
              text: "Review copay amounts for different services",
              time: "5 mins",
              resources: ["https://www.healthcare.gov/glossary/co-payment/"]
            },
            {
              text: "Understand your deductible and how it works",
              time: "5 mins",
              resources: ["https://www.healthcare.gov/glossary/deductible/"]
            },
            {
              text: "Note your out-of-pocket maximum",
              time: "3 mins",
              resources: ["https://www.healthcare.gov/glossary/out-of-pocket-maximum-limit/"]
            },
            {
              text: "Save document to easy-to-find location",
              time: "2 mins",
              resources: ["https://www.google.com/drive", "https://www.dropbox.com"]
            },
            {
              text: "Create summary cheat sheet for your wallet",
              time: "7 mins",
              resources: ["https://www.canva.com", "https://docs.google.com"]
            }
          ]
        },
        { 
          id: "insurance-3", 
          text: "Locate and bookmark your plan's provider directory", 
          completed: false,
          timeEstimate: "15 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Find 'Find a Doctor' or 'Provider Directory' on insurance website",
              time: "3 mins",
              resources: ["https://www.bcbs.com/find-doctor", "https://www.anthem.com/find-care"]
            },
            {
              text: "Test search by entering your zip code",
              time: "3 mins",
              resources: ["https://www.unitedhealthcare.com/find-a-doctor"]
            },
            {
              text: "Bookmark the provider directory page",
              time: "2 mins",
              resources: ["https://support.google.com/chrome/answer/188842"]
            },
            {
              text: "Download provider directory app if available",
              time: "5 mins",
              resources: ["https://apps.apple.com", "https://play.google.com"]
            },
            {
              text: "Practice searching for specific provider types near you",
              time: "2 mins",
              resources: ["https://www.healthgrades.com", "https://www.zocdoc.com"]
            }
          ]
        },
        { 
          id: "insurance-4", 
          text: "Understand your deductible and out-of-pocket maximum", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Find your annual deductible amount on benefits summary",
              time: "3 mins",
              resources: ["https://www.healthcare.gov/glossary/deductible/"]
            },
            {
              text: "Understand what counts toward your deductible",
              time: "5 mins",
              resources: ["https://www.kff.org/health-costs/issue-brief/how-much-do-health-insurance-deductibles-affect-health-care-spending/"]
            },
            {
              text: "Learn the difference between deductible and out-of-pocket max",
              time: "5 mins",
              resources: ["https://www.healthcare.gov/glossary/out-of-pocket-maximum-limit/"]
            },
            {
              text: "Check what services are covered before meeting deductible",
              time: "5 mins",
              resources: ["https://www.healthcare.gov/coverage/preventive-care-benefits/"]
            },
            {
              text: "Calculate how much you might spend in worst-case scenario",
              time: "5 mins",
              resources: ["https://www.calculator.net", "https://sheets.google.com"]
            },
            {
              text: "Plan how to save for potential medical expenses",
              time: "2 mins",
              resources: ["https://www.healthcare.gov/glossary/health-savings-account-hsa/"]
            }
          ]
        },
        { 
          id: "insurance-5", 
          text: "Find in-network urgent care and emergency facilities near you", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Search provider directory for 'urgent care' near your home",
              time: "5 mins",
              resources: ["https://www.bcbs.com/find-doctor", "https://www.anthem.com/find-care"]
            },
            {
              text: "Save addresses and phone numbers of 2-3 closest options",
              time: "5 mins",
              resources: ["https://contacts.google.com", "https://www.apple.com/icloud/contacts/"]
            },
            {
              text: "Search for in-network emergency rooms/hospitals",
              time: "5 mins",
              resources: ["https://www.unitedhealthcare.com/find-a-doctor"]
            },
            {
              text: "Check hours of operation for urgent care centers",
              time: "3 mins",
              resources: ["https://www.google.com/maps"]
            },
            {
              text: "Add urgent care locations to your phone's contacts",
              time: "2 mins",
              resources: ["https://support.apple.com/en-us/HT207207", "https://support.google.com/contacts/"]
            }
          ]
        },
        { 
          id: "insurance-6", 
          text: "Schedule a free preventive care visit (annual physical)", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Easy",
          cost: "Free (covered by insurance)",
          microActions: [
            {
              text: "Verify which preventive services are covered 100%",
              time: "5 mins",
              resources: ["https://www.healthcare.gov/coverage/preventive-care-benefits/"]
            },
            {
              text: "Choose primary care doctor from in-network providers",
              time: "5 mins",
              resources: ["https://www.healthgrades.com", "https://www.zocdoc.com"]
            },
            {
              text: "Call doctor's office to schedule annual physical",
              time: "10 mins",
              resources: ["https://www.mayoclinic.org/healthy-lifestyle/adult-health/in-depth/health-checkup/art-20044699"]
            },
            {
              text: "Confirm appointment is coded as 'preventive' to avoid charges",
              time: "3 mins",
              resources: ["https://www.cms.gov/Outreach-and-Education/Medicare-Learning-Network-MLN/MLNProducts/Downloads/AnnualWellnessVisitFactSheet-ICN907786.pdf"]
            },
            {
              text: "Add appointment to calendar and set preparation reminder",
              time: "2 mins",
              resources: ["https://calendar.google.com", "https://outlook.live.com"]
            }
          ]
        },
        { 
          id: "insurance-7", 
          text: "Review prescription drug coverage and preferred pharmacies", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Find your plan's formulary (covered drug list)",
              time: "5 mins",
              resources: ["https://www.cms.gov/Medicare/Prescription-Drug-Coverage/PrescriptionDrugCovContra/RxUtilization"]
            },
            {
              text: "Check if your current medications are covered",
              time: "5 mins",
              resources: ["https://www.goodrx.com", "https://www.drugs.com"]
            },
            {
              text: "Find preferred (lower-cost) pharmacies in your network",
              time: "5 mins",
              resources: ["https://www.cvs.com", "https://www.walgreens.com", "https://www.costco.com/pharmacy"]
            },
            {
              text: "Compare costs at different pharmacy tiers",
              time: "3 mins",
              resources: ["https://www.goodrx.com", "https://www.singlecare.com"]
            },
            {
              text: "Save preferred pharmacy locations to your contacts",
              time: "2 mins",
              resources: ["https://contacts.google.com"]
            }
          ]
        },
        { 
          id: "insurance-8", 
          text: "Save insurance customer service number in your phone", 
          completed: false,
          timeEstimate: "10 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Find customer service number on your insurance card",
              time: "2 mins",
              resources: ["https://www.healthcare.gov/glossary/member-id/"]
            },
            {
              text: "Save number in phone contacts as 'Insurance - [Company Name]'",
              time: "3 mins",
              resources: ["https://support.apple.com/en-us/HT207207", "https://support.google.com/contacts/"]
            },
            {
              text: "Note member ID and group number in contact notes",
              time: "2 mins",
              resources: ["https://contacts.google.com"]
            },
            {
              text: "Test calling during business hours to verify it works",
              time: "2 mins",
              resources: ["https://www.cms.gov/about-cms/contact-us"]
            },
            {
              text: "Save backup contact methods (website, app)",
              time: "1 min",
              resources: ["https://www.bcbs.com", "https://www.anthem.com"]
            }
          ]
        }
      ],
      tips: [
        "Use telemedicine benefits - they're often cheaper than office visits",
        "Get preventive care early in the year to help meet deductibles",
        "Always verify a provider is in-network before scheduling",
        "Keep copies of all medical bills and insurance explanations of benefits",
        "Use your insurance company's cost estimator tools before procedures"
      ],
      icon: ShieldCheck,
    },
    {
      title: "Mental Health Resources and When to Seek Help",
      summary: "Recognizing when you need support and finding the right resources.",
      difficulty: "Beginner",
      duration: "25 min",
      description: "Prioritize your mental health with confidence. Learn to recognize when you need support, find qualified professionals, and access resources.",
      steps: [
        "Learn common signs that indicate you might benefit from professional help",
        "Understand different types of mental health professionals (therapist, psychologist, psychiatrist)",
        "Check what mental health benefits your insurance covers",
        "Use your insurance provider directory to find in-network therapists",
        "Research therapists' specialties and approaches (CBT, DBT, EMDR, etc.)",
        "Read reviews and check credentials on state licensing boards",
        "Call or email potential therapists to ask about availability and approach",
        "Schedule an initial consultation or intake appointment",
        "Prepare for your first session by thinking about your goals",
        "Learn about crisis resources and when to use them",
        "Understand the difference between therapy and psychiatric medication",
        "Know your rights regarding confidentiality and treatment"
      ],
      tasks: [
        { id: "mental-1", text: "Complete a mental health self-assessment or screening", completed: false },
        { id: "mental-2", text: "Research mental health coverage in your insurance plan", completed: false },
        { id: "mental-3", text: "Find 3 potential therapists in your network", completed: false },
        { id: "mental-4", text: "Schedule an initial therapy consultation", completed: false },
        { id: "mental-5", text: "Save crisis helpline numbers in your phone", completed: false },
        { id: "mental-6", text: "Learn about employee assistance programs if available", completed: false },
        { id: "mental-7", text: "Establish regular self-care and stress management routine", completed: false },
        { id: "mental-8", text: "Build a support network of trusted friends/family", completed: false }
      ],
      tips: [
        "It's normal to 'shop around' for the right therapist - fit matters",
        "Many therapists offer sliding scale fees if cost is a concern",
        "Employee Assistance Programs often provide free counseling sessions",
        "Crisis text lines (text HOME to 741741) are available 24/7",
        "Mental health is as important as physical health - don't wait for a crisis"
      ],
      icon: HeartHandshake,
    },
    {
      title: "Pharmacy 101: Prescriptions and Over-the-Counter",
      summary: "How to fill prescriptions, generic vs brand, and medication safety.",
      difficulty: "Beginner",
      duration: "15 min",
      description: "Navigate pharmacies like a pro. Learn to fill prescriptions, save money on medications, and manage your medicines safely.",
      steps: [
        "Find pharmacies in your insurance network for best coverage",
        "Set up pharmacy accounts and download their mobile apps",
        "Understand how prescriptions work: who can prescribe, how refills work",
        "Learn the difference between generic and brand name medications",
        "Understand how insurance copays work for different medication tiers",
        "Know when to use over-the-counter vs prescription medications",
        "Learn proper medication storage and safety practices",
        "Understand drug interactions and when to consult pharmacists",
        "Set up automatic refills for maintenance medications",
        "Learn how to transfer prescriptions between pharmacies",
        "Understand medication disposal - don't flush or throw in trash",
        "Know how to access patient assistance programs for expensive drugs"
      ],
      tasks: [
        { id: "pharmacy-1", text: "Choose a primary pharmacy and create account", completed: false },
        { id: "pharmacy-2", text: "Download pharmacy app and set up prescription notifications", completed: false },
        { id: "pharmacy-3", text: "Ask pharmacist about generic alternatives to save money", completed: false },
        { id: "pharmacy-4", text: "Create a medication list with names, doses, and schedules", completed: false },
        { id: "pharmacy-5", text: "Set up automatic refills for any regular medications", completed: false },
        { id: "pharmacy-6", text: "Learn how to properly dispose of old medications", completed: false },
        { id: "pharmacy-7", text: "Ask pharmacist about drug interactions with any supplements", completed: false },
        { id: "pharmacy-8", text: "Save pharmacy phone number and 24-hour hotline if available", completed: false }
      ],
      tips: [
        "Generic medications are FDA-approved and typically 80-85% cheaper",
        "Use GoodRx or pharmacy apps to compare prices if uninsured",
        "90-day supplies are often cheaper than 30-day for maintenance meds",
        "Pharmacists are highly trained - don't hesitate to ask questions",
        "Many pharmacies offer free health screenings and immunizations"
      ],
      icon: Stethoscope,
    }
  ],
  "living": [
  {
    title: "Renting 101: Touring, Applications, & Move‑In Day",
    summary: "How to read a lease, deposits, and tenant rights basics.",
      difficulty: "Intermediate",
      duration: "35 min",
      description: "Master the apartment hunting process from start to finish. Learn to find great places, apply successfully, and protect yourself as a tenant.",
      steps: [
        "Set your budget: 30% of gross income maximum for rent + utilities",
        "Research neighborhoods using crime stats, commute times, and amenities",
        "Create a list of must-haves vs nice-to-haves for your apartment",
        "Schedule multiple apartment tours in the same area on one day",
        "Bring a measuring tape, phone charger, and notebook to tours",
        "Test water pressure, check cell service, and inspect for damage",
        "Ask about parking, laundry, noise policies, and guest rules",
        "Gather application documents: pay stubs, bank statements, references",
        "Submit applications quickly in competitive markets",
        "Read the entire lease carefully before signing anything",
        "Understand lease terms: security deposit, pet fees, early termination",
        "Document existing damage with photos during move-in inspection",
        "Get copies of all signed documents and keep them organized",
        "Set up renter's insurance before moving in"
      ],
      tasks: [
        { 
          id: "rent-1", 
          text: "Calculate your realistic housing budget (30% rule)", 
          completed: false,
          timeEstimate: "20 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Calculate your gross monthly income",
              time: "5 mins",
              resources: ["https://www.calculator.net", "https://sheets.google.com"]
            },
            {
              text: "Multiply by 0.30 to find maximum housing budget",
              time: "2 mins",
              resources: ["https://www.nerdwallet.com/mortgages/how-much-house-can-i-afford/calculate-affordability"]
            },
            {
              text: "Research additional costs: utilities, parking, fees",
              time: "8 mins",
              resources: ["https://www.apartments.com/rental-manager/resources/how-much-do-utilities-cost/", "https://www.rentometer.com"]
            },
            {
              text: "Subtract estimated additional costs from housing budget",
              time: "3 mins",
              resources: ["https://www.calculator.net"]
            },
            {
              text: "Write down your final maximum rent amount",
              time: "2 mins",
              resources: ["https://docs.google.com", "https://www.evernote.com"]
            }
          ]
        },
        { 
          id: "rent-2", 
          text: "Research and visit 3 different neighborhoods", 
          completed: false,
          timeEstimate: "3 hours",
          difficulty: "Medium",
          cost: "$10-20 for gas/transportation",
          microActions: [
            {
              text: "Research neighborhoods online using crime and demographic data",
              time: "30 mins",
              resources: ["https://www.neighborhoodscout.com", "https://www.walkscore.com", "https://www.city-data.com"]
            },
            {
              text: "Check commute times to work/school from each area",
              time: "15 mins",
              resources: ["https://maps.google.com", "https://www.waze.com"]
            },
            {
              text: "Look up nearby amenities: grocery stores, restaurants, gyms",
              time: "15 mins",
              resources: ["https://www.yelp.com", "https://foursquare.com"]
            },
            {
              text: "Visit each neighborhood during different times of day",
              time: "90 mins",
              resources: ["https://www.google.com/maps"]
            },
            {
              text: "Walk around, check parking availability and general feel",
              time: "30 mins",
              resources: ["https://www.walkscore.com"]
            }
          ]
        },
        { 
          id: "rent-3", 
          text: "Tour at least 5 apartments to compare options", 
          completed: false,
          timeEstimate: "4 hours spread across 2-3 days",
          difficulty: "Medium",
          cost: "$15-30 for gas/transportation",
          microActions: [
            {
              text: "Schedule 5-7 apartment tours via phone or online",
              time: "30 mins",
              resources: ["https://www.apartments.com", "https://www.zillow.com/rentals", "https://www.rent.com"]
            },
            {
              text: "Create apartment comparison checklist",
              time: "15 mins",
              resources: ["https://sheets.google.com", "https://docs.google.com"]
            },
            {
              text: "Take photos/videos during each tour for later comparison",
              time: "5 mins per tour",
              resources: ["https://www.apple.com/iphone/", "https://photos.google.com"]
            },
            {
              text: "Ask about utilities, fees, lease terms at each location",
              time: "10 mins per tour",
              resources: ["https://www.apartments.com/rental-manager/resources/questions-to-ask/"]
            },
            {
              text: "Visit neighborhood around each apartment",
              time: "15 mins per location",
              resources: ["https://www.walkscore.com", "https://maps.google.com"]
            },
            {
              text: "Compare pros/cons and narrow to top 2 choices",
              time: "20 mins",
              resources: ["https://sheets.google.com"]
            }
          ]
        },
        { 
          id: "rent-4", 
          text: "Submit a complete rental application", 
          completed: false,
          timeEstimate: "90 mins",
          difficulty: "Medium",
          cost: "$50-150 application fees",
          microActions: [
            {
              text: "Gather required documents: ID, pay stubs, tax returns",
              time: "20 mins",
              resources: ["https://www.apartments.com/rental-manager/resources/rental-application-requirements/"]
            },
            {
              text: "Prepare references list: previous landlords, employers",
              time: "15 mins",
              resources: ["https://contacts.google.com"]
            },
            {
              text: "Fill out application completely and accurately",
              time: "30 mins",
              resources: ["https://www.nolo.com/legal-encyclopedia/free-books/renters-rights-book/chapter1-2.html"]
            },
            {
              text: "Pay application fee (usually $50-150 per application)",
              time: "5 mins",
              resources: ["https://www.nerdwallet.com/article/finance/rental-application-fees"]
            },
            {
              text: "Submit application same day if you want the apartment",
              time: "10 mins",
              resources: ["https://www.apartments.com"]
            },
            {
              text: "Follow up within 2-3 days if no response",
              time: "10 mins",
              resources: ["https://www.zillow.com/rental-manager/resources/follow-up-rental-application/"]
            }
          ]
        },
        { 
          id: "rent-5", 
          text: "Read and understand a full lease agreement", 
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Hard",
          cost: "Free",
          microActions: [
            {
              text: "Read entire lease slowly, highlighting confusing terms",
              time: "25 mins",
              resources: ["https://www.nolo.com/legal-encyclopedia/free-books/renters-rights-book/"]
            },
            {
              text: "Look up any legal terms you don't understand",
              time: "10 mins",
              resources: ["https://www.nolo.com/dictionary/", "https://www.investopedia.com/terms/"]
            },
            {
              text: "Note move-in costs: deposits, fees, first month's rent",
              time: "5 mins",
              resources: ["https://www.calculator.net"]
            },
            {
              text: "Understand pet policy, guest policy, and restrictions",
              time: "3 mins",
              resources: ["https://www.apartments.com/rental-manager/resources/lease-agreement-terms/"]
            },
            {
              text: "Ask landlord to clarify anything confusing before signing",
              time: "2 mins",
              resources: ["https://www.nolo.com/legal-encyclopedia/questions-ask-landlord-before-renting.html"]
            }
          ]
        },
        { 
          id: "rent-6", 
          text: "Complete move-in inspection with photos", 
          completed: false,
          timeEstimate: "60 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Download move-in inspection checklist template",
              time: "5 mins",
              resources: ["https://www.apartments.com/rental-manager/resources/move-in-checklist/", "https://docs.google.com"]
            },
            {
              text: "Test all lights, outlets, appliances, and fixtures",
              time: "20 mins",
              resources: ["https://www.familyhandyman.com/article/home-inspection-checklist/"]
            },
            {
              text: "Check for existing damage: walls, floors, windows",
              time: "15 mins",
              resources: ["https://www.nolo.com/legal-encyclopedia/move-inspection-guide-tenants.html"]
            },
            {
              text: "Take photos/videos of any damage or issues",
              time: "10 mins",
              resources: ["https://photos.google.com", "https://www.dropbox.com"]
            },
            {
              text: "Complete inspection form with landlord present",
              time: "8 mins",
              resources: ["https://www.nolo.com/legal-encyclopedia/move-inspection-guide-tenants.html"]
            },
            {
              text: "Keep copy of signed inspection for your records",
              time: "2 mins",
              resources: ["https://www.google.com/drive", "https://www.evernote.com"]
            }
          ]
        },
        { 
          id: "rent-7", 
          text: "Purchase renter's insurance policy", 
          completed: false,
          timeEstimate: "40 mins",
          difficulty: "Medium",
          cost: "$10-25/month",
          microActions: [
            {
              text: "Research what renter's insurance covers vs doesn't cover",
              time: "10 mins",
              resources: ["https://www.nerdwallet.com/article/insurance/renters-insurance", "https://www.iii.org/article/what-renters-insurance"]
            },
            {
              text: "Get quotes from 3 different insurance companies",
              time: "15 mins",
              resources: ["https://www.geico.com/renters-insurance/", "https://www.statefarm.com/insurance/renters", "https://www.progressive.com/renters/"]
            },
            {
              text: "Compare coverage amounts and deductibles",
              time: "8 mins",
              resources: ["https://www.nerdwallet.com/article/insurance/renters-insurance-coverage"]
            },
            {
              text: "Choose policy and complete application online",
              time: "5 mins",
              resources: ["https://www.geico.com", "https://www.statefarm.com"]
            },
            {
              text: "Save policy documents and add to emergency folder",
              time: "2 mins",
              resources: ["https://www.google.com/drive", "https://www.dropbox.com"]
            }
          ]
        },
        { 
          id: "rent-8", 
          text: "Set up a system for organizing important rental documents", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Easy",
          cost: "Free or $10 for physical folder",
          microActions: [
            {
              text: "Create digital folder: Rental Documents [Address]",
              time: "5 mins",
              resources: ["https://www.google.com/drive", "https://www.dropbox.com"]
            },
            {
              text: "Scan/upload: lease, inspection, insurance, receipts",
              time: "15 mins",
              resources: ["https://www.adobe.com/acrobat/mobile/scanner-app.html", "https://apps.apple.com/us/app/notes/"]
            },
            {
              text: "Create physical folder for emergencies/quick access",
              time: "5 mins",
              resources: ["https://www.staples.com", "https://www.target.com"]
            },
            {
              text: "Save landlord contact info in phone and email",
              time: "3 mins",
              resources: ["https://contacts.google.com"]
            },
            {
              text: "Set calendar reminders for rent due date and lease renewal",
              time: "2 mins",
              resources: ["https://calendar.google.com", "https://outlook.live.com"]
            }
          ]
        },
      ],
      tips: [
        "Apply same day if you love a place - good apartments go fast",
        "Bring all application materials printed and ready to submit",
        "Visit neighborhoods at different times of day to get a feel for them",
        "Ask current tenants about their experience living there",
        "Budget for first month, last month, security deposit, and moving costs"
      ],
    icon: Home,
  },
  {
      title: "Setting Up Utilities in Your First Apartment",
      summary: "Electricity, gas, internet, and water - what you need to know.",
      difficulty: "Beginner",
      duration: "25 min",
      description: "Get your new place fully functional with all essential utilities. Learn to compare providers, avoid deposits, and budget for monthly costs.",
      steps: [
        "Contact previous tenant or landlord to find out current utility providers",
        "List all needed utilities: electricity, gas, water, trash, internet, cable",
        "Research utility companies in your area and compare rates",
        "Check if any utilities are included in your rent",
        "Call to schedule service start dates 1-2 weeks before move-in",
        "Ask about security deposits and how to avoid them (good credit)",
        "Set up auto-pay for all utilities to avoid late fees",
        "Understand your electricity plan: fixed rate vs variable rate",
        "Choose internet speed based on your usage (streaming, gaming, work)",
        "Budget for installation fees and first month's bills",
        "Set up accounts online and download utility apps",
        "Know how to read your meters and report outages"
      ],
      tasks: [
        { 
          id: "utilities-1", 
          text: "Create list of all utilities needed for your area", 
          completed: false,
          timeEstimate: "25 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Research basic utilities: electricity, gas, water, sewer, trash",
              time: "10 mins",
              resources: ["https://www.consumeraffairs.com/utilities/", "https://www.energy.gov/"]
            },
            {
              text: "Check if any utilities are included in rent",
              time: "3 mins",
              resources: ["https://www.apartments.com/rental-manager/resources/what-utilities-do-landlords-pay/"]
            },
            {
              text: "List additional services: internet, cable/streaming, phone",
              time: "5 mins",
              resources: ["https://www.broadbandnow.com", "https://www.cnet.com/home/internet/"]
            },
            {
              text: "Research security deposit requirements for each utility",
              time: "5 mins",
              resources: ["https://www.nerdwallet.com/article/finance/utility-deposits"]
            },
            {
              text: "Create checklist with contact info for each utility company",
              time: "2 mins",
              resources: ["https://docs.google.com", "https://sheets.google.com"]
            }
          ]
        },
        { id: "utilities-2", text: "Research and compare electricity/gas providers", completed: false },
        { id: "utilities-3", text: "Schedule all utility connections before move-in date", completed: false },
        { id: "utilities-4", text: "Set up internet service with appropriate speed", completed: false },
        { id: "utilities-5", text: "Establish online accounts for all utilities", completed: false },
        { id: "utilities-6", text: "Set up automatic payments to avoid late fees", completed: false },
        { id: "utilities-7", text: "Create monthly budget including all utility costs", completed: false },
        { id: "utilities-8", text: "Learn how to read your meters and report issues", completed: false }
      ],
      tips: [
        "Shop around for electricity/gas - rates can vary significantly",
        "Avoid variable rate plans - they can spike unexpectedly",
        "Ask about paperless billing discounts to save money",
        "Set up service 1-2 weeks early to ensure everything works on move-in day",
        "Keep utility company numbers handy for outages and emergencies"
      ],
      icon: Home,
    },
    {
      title: "Basic Home Maintenance and Cleaning",
      summary: "Weekly, monthly, and seasonal tasks to keep your place livable.",
      difficulty: "Beginner",
      duration: "20 min",
      description: "Maintain a clean, healthy living space with manageable routines. Learn essential cleaning skills and prevent costly damage.",
      steps: [
        "Create a daily 10-minute pickup routine: dishes, mail, clothes",
        "Establish weekly cleaning schedule: bathroom, kitchen, floors, trash",
        "Learn proper techniques: vacuum patterns, bathroom disinfecting",
        "Stock essential cleaning supplies: all-purpose cleaner, microfiber cloths",
        "Clean spills immediately to prevent stains and damage",
        "Change HVAC filters every 3 months to maintain air quality",
        "Deep clean monthly: baseboards, windows, appliances, closets",
        "Seasonal tasks: smoke detector batteries, gutter cleaning",
        "Know when to call professionals vs DIY repairs",
        "Document any damage and report to landlord immediately",
        "Keep cleaning supplies organized and easily accessible",
        "Develop systems that work for your schedule and lifestyle"
      ],
      tasks: [
        { id: "cleaning-1", text: "Create and stock a basic cleaning supply kit", completed: false },
        { id: "cleaning-2", text: "Establish a daily 10-minute pickup routine", completed: false },
        { id: "cleaning-3", text: "Create a weekly cleaning schedule and follow it", completed: false },
        { id: "cleaning-4", text: "Learn proper bathroom and kitchen deep cleaning", completed: false },
        { id: "cleaning-5", text: "Change HVAC filter and set calendar reminders", completed: false },
        { id: "cleaning-6", text: "Complete one monthly deep cleaning session", completed: false },
        { id: "cleaning-7", text: "Organize cleaning supplies in convenient location", completed: false },
        { id: "cleaning-8", text: "Create system for reporting and tracking home issues", completed: false }
      ],
      tips: [
        "Clean as you go - it's easier than letting things pile up",
        "Microfiber cloths work better than paper towels for most tasks",
        "Open windows while cleaning for better air circulation",
        "Take before/after photos to stay motivated and track progress",
        "Involve roommates with shared cleaning schedules and expectations"
      ],
      icon: Home,
    },
    {
      title: "Roommate Guidelines and Conflict Resolution",
      summary: "Setting boundaries, splitting costs, and handling disagreements.",
      difficulty: "Intermediate",
      duration: "30 min",
      description: "Build successful roommate relationships through clear communication and fair agreements. Handle conflicts professionally and know when to move on.",
      steps: [
        "Discuss expectations before moving in together: cleanliness, guests, noise",
        "Create a written roommate agreement covering all major issues",
        "Decide how to split rent, utilities, groceries, and shared supplies",
        "Establish quiet hours and guest policies that work for everyone",
        "Set up shared calendar for chores, bills, and apartment issues",
        "Agree on kitchen and bathroom usage schedules",
        "Discuss personal property boundaries and borrowing policies",
        "Create a system for handling bills and tracking shared expenses",
        "Address conflicts early and directly through calm conversations",
        "Know your rights and responsibilities according to the lease",
        "Understand when mediation or landlord involvement is necessary",
        "Have an exit strategy if the living situation becomes unworkable"
      ],
      tasks: [
        { id: "roommate-1", text: "Create comprehensive written roommate agreement", completed: false },
        { id: "roommate-2", text: "Set up fair system for splitting all expenses", completed: false },
        { id: "roommate-3", text: "Establish shared calendar for chores and responsibilities", completed: false },
        { id: "roommate-4", text: "Agree on guest policies and quiet hours", completed: false },
        { id: "roommate-5", text: "Create system for tracking shared expenses", completed: false },
        { id: "roommate-6", text: "Practice having a difficult conversation about a minor issue", completed: false },
        { id: "roommate-7", text: "Research tenant rights and lease obligations", completed: false },
        { id: "roommate-8", text: "Develop backup plan if roommate situation doesn't work", completed: false }
      ],
      tips: [
        "Address small issues before they become big problems",
        "Use 'I' statements when discussing conflicts to avoid defensiveness",
        "Split costs proportionally based on income if there's a big difference",
        "Keep receipts and track shared expenses with apps like Splitwise",
        "Remember that compromise is key - you both deserve to feel comfortable at home"
      ],
      icon: HeartHandshake,
    }
  ],
  "career": [
    {
      title: "Writing a Resume That Gets Noticed",
      summary: "Format, content, and keywords that help you land interviews.",
      difficulty: "Intermediate",
      duration: "30 min",
      description: "Create a compelling resume that stands out to hiring managers and beats applicant tracking systems. Learn modern formatting and content strategies.",
      steps: [
        "Choose the right format: reverse-chronological for most people",
        "Start with a compelling professional summary (2-3 sentences)",
        "List contact information: email, phone, LinkedIn, city/state",
        "Use consistent formatting: fonts, spacing, bullet points",
        "Focus on achievements, not just job duties",
        "Quantify results with numbers, percentages, and dollar amounts",
        "Include relevant keywords from the job posting",
        "Keep it concise: 1 page for entry-level, 2 pages max for experienced",
        "Proofread multiple times for spelling and grammar errors",
        "Save as PDF to preserve formatting across different systems",
        "Tailor each resume to the specific job you're applying for",
        "Get feedback from professionals in your field"
      ],
      tasks: [
        { 
          id: "resume-1", 
          text: "Choose professional resume template or format", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Easy",
          cost: "Free or $10-20 for premium templates",
          microActions: [
            {
              text: "Browse free resume templates on Google Docs or Canva",
              time: "10 mins",
              resources: ["https://docs.google.com/document/u/0/?ftv=1&folder=0AKrOH2pFmj6VUk9PVA&tgif=d", "https://www.canva.com/resumes/templates/"]
            },
            {
              text: "Look at industry-specific resume examples",
              time: "10 mins",
              resources: ["https://www.indeed.com/career-advice/resumes-cover-letters/resume-examples", "https://resumegenius.com/resume-samples"]
            },
            {
              text: "Choose template that matches your field and experience level",
              time: "5 mins",
              resources: ["https://www.thebalancecareers.com/resume-formats-with-examples-and-formatting-tips-2063591"]
            },
            {
              text: "Download template and save as your name (FirstLast_Resume)",
              time: "3 mins",
              resources: ["https://www.google.com/drive"]
            },
            {
              text: "Set up document with your contact information",
              time: "2 mins",
              resources: ["https://www.thebalancecareers.com/what-to-include-in-a-resume-header-2062999"]
            }
          ]
        },
        { 
          id: "resume-2", 
          text: "Write compelling professional summary statement", 
          completed: false,
          timeEstimate: "45 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Research 5-10 professional summary examples in your field",
              time: "15 mins",
              resources: ["https://www.indeed.com/career-advice/resumes-cover-letters/how-to-write-a-professional-summary", "https://resumegenius.com/blog/resume-help/professional-summary"]
            },
            {
              text: "List your top 3-4 skills and areas of expertise",
              time: "5 mins",
              resources: ["https://www.thebalancecareers.com/list-of-skills-for-resumes-2062422"]
            },
            {
              text: "Write 2-3 sentence summary highlighting your value proposition",
              time: "15 mins",
              resources: ["https://www.monster.com/career-advice/article/sample-resume-summary-statements"]
            },
            {
              text: "Include 1-2 specific achievements or metrics if possible",
              time: "5 mins",
              resources: ["https://www.themuse.com/advice/185-powerful-verbs-that-will-make-your-resume-awesome"]
            },
            {
              text: "Read aloud and edit for clarity and impact",
              time: "5 mins",
              resources: ["https://www.grammarly.com", "https://hemingwayapp.com"]
            }
          ]
        },
        { 
          id: "resume-3", 
          text: "List work experience with quantified achievements", 
          completed: false,
          timeEstimate: "60 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "List all jobs chronologically with dates and titles",
              time: "15 mins",
              resources: ["https://www.indeed.com/career-advice/resumes-cover-letters/how-to-format-work-experience"]
            },
            {
              text: "Write 3-5 bullet points for each role focusing on achievements",
              time: "25 mins",
              resources: ["https://www.themuse.com/advice/185-powerful-verbs-that-will-make-your-resume-awesome"]
            },
            {
              text: "Quantify achievements with numbers, percentages, or dollars",
              time: "15 mins",
              resources: ["https://www.harvard.edu/career-services/resources/resumes-cvs-cover-letters/"]
            },
            {
              text: "Use action verbs to start each bullet point",
              time: "3 mins",
              resources: ["https://www.monster.com/career-advice/article/resume-action-verbs"]
            },
            {
              text: "Focus on results and impact, not just job duties",
              time: "2 mins",
              resources: ["https://www.glassdoor.com/blog/guide/how-to-write-a-resume/"]
            }
          ]
        },
        { 
          id: "resume-4", 
          text: "Add relevant skills and keywords for your field", 
          completed: false,
          timeEstimate: "35 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Research 10-15 job postings in your target field",
              time: "15 mins",
              resources: ["https://www.indeed.com", "https://www.linkedin.com/jobs", "https://www.glassdoor.com"]
            },
            {
              text: "Identify commonly mentioned skills and keywords",
              time: "10 mins",
              resources: ["https://www.jobscan.co/blog/resume-keywords/"]
            },
            {
              text: "List your technical skills: software, tools, programming",
              time: "5 mins",
              resources: ["https://www.thebalancecareers.com/list-of-skills-for-resumes-2062422"]
            },
            {
              text: "Add soft skills: communication, leadership, problem-solving",
              time: "3 mins",
              resources: ["https://www.indeed.com/career-advice/resumes-cover-letters/soft-skills"]
            },
            {
              text: "Match keywords from job posting to your experience",
              time: "2 mins",
              resources: ["https://www.jobscan.co"]
            }
          ]
        },
        { 
          id: "resume-5", 
          text: "Proofread resume thoroughly for errors", 
          completed: false,
          timeEstimate: "30 mins",
          difficulty: "Easy",
          cost: "Free",
          microActions: [
            {
              text: "Read resume aloud slowly to catch awkward phrasing",
              time: "10 mins",
              resources: ["https://www.grammarly.com", "https://hemingwayapp.com"]
            },
            {
              text: "Check all dates, phone numbers, and email addresses",
              time: "5 mins",
              resources: ["https://docs.google.com"]
            },
            {
              text: "Verify consistent formatting: fonts, spacing, bullet points",
              time: "8 mins",
              resources: ["https://www.canva.com/resumes/templates/"]
            },
            {
              text: "Use spell check and grammar check tools",
              time: "5 mins",
              resources: ["https://www.grammarly.com", "https://languagetool.org"]
            },
            {
              text: "Print resume to check how it looks on paper",
              time: "2 mins",
              resources: ["https://www.fedex.com/en-us/printing.html", "https://www.staples.com/services/printing/"]
            }
          ]
        },
        { 
          id: "resume-6", 
          text: "Get feedback from 2-3 professionals or mentors", 
          completed: false,
          timeEstimate: "2 hours over several days",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Identify 3 people: mentor, colleague, recruiter, or career counselor",
              time: "10 mins",
              resources: ["https://www.linkedin.com", "https://www.score.org/find-mentor"]
            },
            {
              text: "Send polite email requesting resume feedback with deadline",
              time: "15 mins",
              resources: ["https://www.indeed.com/career-advice/resumes-cover-letters/how-to-ask-for-resume-feedback"]
            },
            {
              text: "Follow up with those who agreed within their timeline",
              time: "10 mins",
              resources: ["https://docs.google.com"]
            },
            {
              text: "Review all feedback and identify common suggestions",
              time: "20 mins",
              resources: ["https://sheets.google.com"]
            },
            {
              text: "Make prioritized list of changes to implement",
              time: "10 mins",
              resources: ["https://docs.google.com"]
            },
            {
              text: "Send thank you notes to everyone who provided feedback",
              time: "15 mins",
              resources: ["https://www.grammarly.com"]
            }
          ]
        },
        { id: "resume-7", text: "Create master resume with all experiences", completed: false },
        { id: "resume-8", text: "Tailor resume for a specific job application", completed: false }
      ],
      tips: [
        "Use action verbs to start each bullet point (managed, created, improved)",
        "Focus on results and impact, not just responsibilities",
        "Include relevant coursework, projects, and volunteer work if you're entry-level",
        "Use the same keywords from the job posting (but don't stuff them)",
        "Keep personal information private - no photos, age, marital status"
      ],
      icon: Briefcase,
    },
    {
      title: "Job Interview Preparation and Follow-up",
      summary: "Research, practice questions, what to wear, and post-interview steps.",
      difficulty: "Intermediate",
      duration: "40 min",
      description: "Ace job interviews with thorough preparation and professional follow-up. Learn to research companies, practice answers, and make lasting impressions.",
      steps: [
        "Research the company: mission, values, recent news, competitors",
        "Review the job description and match your skills to requirements",
        "Prepare answers to common questions using the STAR method",
        "Practice your 30-second elevator pitch about yourself",
        "Prepare thoughtful questions to ask the interviewer",
        "Plan your outfit 1-2 days in advance (business professional)",
        "Do a practice run to the location to time your commute",
        "Prepare copies of your resume, references, and work samples",
        "Practice good body language: eye contact, firm handshake, posture",
        "Send thank-you email within 24 hours of the interview",
        "Follow up appropriately without being pushy",
        "Learn from each interview to improve for next time"
      ],
      tasks: [
        { 
          id: "interview-1", 
          text: "Research company thoroughly (website, news, Glassdoor)", 
          completed: false,
          timeEstimate: "60 mins",
          difficulty: "Medium",
          cost: "Free",
          microActions: [
            {
              text: "Read company's About page, mission, values, and recent news",
              time: "20 mins",
              resources: ["https://www.google.com/news", "https://www.crunchbase.com"]
            },
            {
              text: "Research company culture and employee reviews on Glassdoor",
              time: "15 mins",
              resources: ["https://www.glassdoor.com", "https://www.indeed.com/cmp"]
            },
            {
              text: "Look up interviewer(s) on LinkedIn for background",
              time: "10 mins",
              resources: ["https://www.linkedin.com"]
            },
            {
              text: "Research industry trends and challenges the company faces",
              time: "10 mins",
              resources: ["https://www.reuters.com/business", "https://techcrunch.com"]
            },
            {
              text: "Find recent company achievements, products, or initiatives",
              time: "3 mins",
              resources: ["https://www.google.com/news"]
            },
            {
              text: "Take notes on key points to reference during interview",
              time: "2 mins",
              resources: ["https://docs.google.com", "https://www.evernote.com"]
            }
          ]
        },
        { id: "interview-2", text: "Practice answers to 10 common interview questions", completed: false },
        { id: "interview-3", text: "Prepare 5-8 thoughtful questions to ask interviewer", completed: false },
        { id: "interview-4", text: "Choose and prepare professional interview outfit", completed: false },
        { id: "interview-5", text: "Do practice run to interview location", completed: false },
        { id: "interview-6", text: "Complete a mock interview with someone", completed: false },
        { id: "interview-7", text: "Send prompt, personalized thank-you email", completed: false },
        { id: "interview-8", text: "Follow up appropriately after interview", completed: false }
      ],
      tips: [
        "Arrive 10-15 minutes early, but not more than that",
        "Bring a notebook and pen to take notes during the interview",
        "Turn off your phone completely - don't just put it on silent",
        "Be prepared to give specific examples of your accomplishments",
        "Ask about next steps and timeline at the end of the interview"
      ],
      icon: Briefcase,
    },
    {
      title: "Workplace Etiquette and Professional Behavior",
      summary: "Office culture, email communication, and building relationships.",
      difficulty: "Beginner",
      duration: "25 min",
      description: "Navigate workplace culture successfully from day one. Learn professional communication, meeting etiquette, and relationship-building strategies.",
      steps: [
        "Observe office culture during your first week: dress code, communication style",
        "Arrive on time consistently and be prepared for meetings",
        "Learn colleagues' names and roles within your first month",
        "Practice professional email etiquette: clear subjects, proper greetings",
        "Participate appropriately in meetings: listen actively, contribute thoughtfully",
        "Be respectful of others' time: arrive prepared, end meetings on time",
        "Maintain professional boundaries while being friendly and approachable",
        "Handle conflicts diplomatically through direct, respectful conversation",
        "Take initiative without overstepping your role or authority",
        "Ask questions when unclear rather than guessing",
        "Give credit to others and take responsibility for your mistakes",
        "Build relationships gradually through consistent professional behavior"
      ],
      tasks: [
        { id: "workplace-1", text: "Observe and adapt to office culture and dress code", completed: false },
        { id: "workplace-2", text: "Learn names and roles of key colleagues", completed: false },
        { id: "workplace-3", text: "Practice professional email communication", completed: false },
        { id: "workplace-4", text: "Participate effectively in at least 3 meetings", completed: false },
        { id: "workplace-5", text: "Build positive relationship with immediate supervisor", completed: false },
        { id: "workplace-6", text: "Handle a workplace conflict or disagreement professionally", completed: false },
        { id: "workplace-7", text: "Take initiative on a project or improvement", completed: false },
        { id: "workplace-8", text: "Give and receive feedback professionally", completed: false }
      ],
      tips: [
        "When in doubt about office culture, observe before acting",
        "Be friendly but maintain professional boundaries",
        "Avoid gossiping or participating in office drama",
        "Offer help to colleagues when you have capacity",
        "Take notes during meetings and follow up on action items"
      ],
      icon: HeartHandshake,
    },
    {
      title: "Negotiating Your First Salary",
      summary: "Research market rates, practice negotiation, and timing your ask.",
      difficulty: "Advanced",
      duration: "35 min",
      description: "Negotiate fair compensation with confidence and professionalism. Learn market research, timing, and negotiation strategies for your first job.",
      steps: [
        "Research salary ranges for your role using Glassdoor, PayScale, LinkedIn",
        "Consider total compensation: base salary, benefits, vacation, bonuses",
        "Document your education, skills, and relevant experience",
        "Wait for a job offer before discussing salary in detail",
        "Express enthusiasm for the role before negotiating",
        "Ask for 10-20% above their offer if it's below market rate",
        "Practice your negotiation conversation with a friend",
        "Be prepared to justify your request with market research",
        "Consider non-salary benefits if they can't move on base pay",
        "Get the final offer in writing before accepting",
        "Be professional and grateful regardless of the outcome",
        "Know when to accept a fair offer vs when to walk away"
      ],
      tasks: [
        { id: "salary-1", text: "Research market salary ranges for your target role", completed: false },
        { id: "salary-2", text: "Calculate your minimum acceptable salary", completed: false },
        { id: "salary-3", text: "Document your qualifications and value proposition", completed: false },
        { id: "salary-4", text: "Practice salary negotiation conversation", completed: false },
        { id: "salary-5", text: "Research company's typical benefits package", completed: false },
        { id: "salary-6", text: "Prepare to negotiate non-salary benefits if needed", completed: false },
        { id: "salary-7", text: "Successfully negotiate an offer (or decline professionally)", completed: false },
        { id: "salary-8", text: "Get final offer in writing before accepting", completed: false }
      ],
      tips: [
        "Never negotiate salary until you have a job offer in hand",
        "Focus on value you bring, not your personal financial needs",
        "Be prepared to walk away if the offer is significantly below market",
        "Consider the growth potential and learning opportunities",
        "Don't negotiate every single aspect - pick your battles wisely"
      ],
      icon: Wallet,
    }
  ]
};

const FEATURED_GUIDES = [
  DETAILED_GUIDES["money-finance"][0],
  DETAILED_GUIDES["health"][0], 
  DETAILED_GUIDES["living"][0],
  DETAILED_GUIDES["money-finance"][1],
];

// -----------------------------
// Gamification System
// -----------------------------
const ACHIEVEMENTS = [
  // ===== COMMON ACHIEVEMENTS (40 total) =====
  // First Steps & Early Progress
  {
    id: "first-steps",
    title: "First Steps",
    description: "Complete your first guide",
    icon: Rocket,
    points: 50,
    requirement: { type: "guides_completed", count: 1 },
    rarity: "common"
  },
  {
    id: "task-master",
    title: "Task Master",
    description: "Complete your first task",
    icon: CheckSquare,
    points: 25,
    requirement: { type: "tasks_completed", count: 1 },
    rarity: "common"
  },
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Complete 3 guides",
    icon: Target,
    points: 100,
    requirement: { type: "guides_completed", count: 3 },
    rarity: "common"
  },
  {
    id: "momentum-builder",
    title: "Momentum Builder",
    description: "Complete 5 guides",
    icon: TrendingUp,
    points: 150,
    requirement: { type: "guides_completed", count: 5 },
    rarity: "common"
  },
  {
    id: "task-crusher",
    title: "Task Crusher",
    description: "Complete 10 tasks",
    icon: Zap,
    points: 100,
    requirement: { type: "tasks_completed", count: 10 },
    rarity: "common"
  },
  {
    id: "daily-doer",
    title: "Daily Doer",
    description: "Complete tasks on 3 different days",
    icon: Calendar,
    points: 75,
    requirement: { type: "active_days", count: 3 },
    rarity: "common"
  },
  {
    id: "week-warrior",
    title: "Week Warrior",
    description: "Complete tasks for 7 days",
    icon: Clock,
    points: 150,
    requirement: { type: "active_days", count: 7 },
    rarity: "common"
  },
  {
    id: "point-collector",
    title: "Point Collector",
    description: "Earn 500 XP",
    icon: Star,
    points: 100,
    requirement: { type: "points_earned", count: 500 },
    rarity: "common"
  },
  {
    id: "explorer",
    title: "Explorer",
    description: "Try guides from 2 different categories",
    icon: Compass,
    points: 100,
    requirement: { type: "categories_touched", count: 2 },
    rarity: "common"
  },
  {
    id: "quick-learner",
    title: "Quick Learner",
    description: "Complete 3 guides in one day",
    icon: Bolt,
    points: 200,
    requirement: { type: "guides_in_day", count: 3 },
    rarity: "common"
  },

  // Category Starters (5 achievements)
  {
    id: "money-curious",
    title: "Money Curious",
    description: "Complete your first Money & Finance guide",
    icon: DollarSign,
    points: 75,
    requirement: { type: "category_started", category: "money-finance" },
    rarity: "common"
  },
  {
    id: "health-conscious",
    title: "Health Conscious",
    description: "Complete your first Health & Wellness guide",
    icon: Heart,
    points: 75,
    requirement: { type: "category_started", category: "health" },
    rarity: "common"
  },
  {
    id: "skill-seeker",
    title: "Skill Seeker",
    description: "Complete your first Life Skills guide",
    icon: Wrench,
    points: 75,
    requirement: { type: "category_started", category: "life-skills" },
    rarity: "common"
  },
  {
    id: "career-focused",
    title: "Career Focused",
    description: "Complete your first Career & Education guide",
    icon: Briefcase,
    points: 75,
    requirement: { type: "category_started", category: "career" },
    rarity: "common"
  },
  {
    id: "social-butterfly",
    title: "Social Butterfly",
    description: "Complete your first Social & Relationships guide",
    icon: Users,
    points: 75,
    requirement: { type: "category_started", category: "social" },
    rarity: "common"
  },

  // Progress Milestones (10 achievements)
  {
    id: "steady-progress",
    title: "Steady Progress",
    description: "Complete 10 guides",
    icon: BarChart3,
    points: 250,
    requirement: { type: "guides_completed", count: 10 },
    rarity: "common"
  },
  {
    id: "task-enthusiast",
    title: "Task Enthusiast",
    description: "Complete 25 tasks",
    icon: ListChecks,
    points: 200,
    requirement: { type: "tasks_completed", count: 25 },
    rarity: "common"
  },
  {
    id: "xp-hunter",
    title: "XP Hunter",
    description: "Earn 1,000 XP",
    icon: Target,
    points: 150,
    requirement: { type: "points_earned", count: 1000 },
    rarity: "common"
  },
  {
    id: "consistency-king",
    title: "Consistency King",
    description: "Complete tasks for 14 days",
    icon: Crown,
    points: 300,
    requirement: { type: "active_days", count: 14 },
    rarity: "common"
  },
  {
    id: "multi-tasker",
    title: "Multi-tasker",
    description: "Complete 5 tasks in one day",
    icon: Layers,
    points: 150,
    requirement: { type: "tasks_in_day", count: 5 },
    rarity: "common"
  },
  {
    id: "weekend-warrior",
    title: "Weekend Warrior",
    description: "Complete tasks on both Saturday and Sunday",
    icon: Sun,
    points: 100,
    requirement: { type: "weekend_active", count: 1 },
    rarity: "common"
  },
  {
    id: "early-bird",
    title: "Early Bird",
    description: "Complete a task before 9 AM",
    icon: Sunrise,
    points: 100,
    requirement: { type: "early_completion", count: 1 },
    rarity: "common"
  },
  {
    id: "night-owl",
    title: "Night Owl",
    description: "Complete a task after 9 PM",
    icon: Moon,
    points: 100,
    requirement: { type: "late_completion", count: 1 },
    rarity: "common"
  },
  {
    id: "category-sampler",
    title: "Category Sampler",
    description: "Try guides from 3 different categories",
    icon: Grid3X3,
    points: 150,
    requirement: { type: "categories_touched", count: 3 },
    rarity: "common"
  },
  {
    id: "well-rounded",
    title: "Well-Rounded",
    description: "Complete at least 2 guides in 3 categories",
    icon: Circle,
    points: 250,
    requirement: { type: "balanced_progress", count: 3 },
    rarity: "common"
  },

  // Streak Achievements (15 achievements)
  {
    id: "streak-starter",
    title: "Streak Starter",
    description: "Maintain a 3-day learning streak",
    icon: Flame,
    points: 100,
    requirement: { type: "streak", count: 3 },
    rarity: "common"
  },
  {
    id: "streak-keeper",
    title: "Streak Keeper",
    description: "Maintain a 5-day learning streak",
    icon: Flame,
    points: 150,
    requirement: { type: "streak", count: 5 },
    rarity: "common"
  },
  {
    id: "week-streaker",
    title: "Week Streaker",
    description: "Maintain a 7-day learning streak",
    icon: Flame,
    points: 200,
    requirement: { type: "streak", count: 7 },
    rarity: "common"
  },
  {
    id: "double-week",
    title: "Double Week",
    description: "Maintain a 14-day learning streak",
    icon: Flame,
    points: 350,
    requirement: { type: "streak", count: 14 },
    rarity: "common"
  },
  {
    id: "three-week-hero",
    title: "Three Week Hero",
    description: "Maintain a 21-day learning streak",
    icon: Flame,
    points: 500,
    requirement: { type: "streak", count: 21 },
    rarity: "common"
  },

  // ===== UNCOMMON ACHIEVEMENTS (30 total) =====
  // Higher Progress Milestones
  {
    id: "dedicated-learner",
    title: "Dedicated Learner",
    description: "Complete 15 guides",
    icon: BookOpen,
    points: 400,
    requirement: { type: "guides_completed", count: 15 },
    rarity: "uncommon"
  },
  {
    id: "overachiever",
    title: "Overachiever",
    description: "Complete 20 guides",
    icon: Star,
    points: 500,
    requirement: { type: "guides_completed", count: 20 },
    rarity: "uncommon"
  },
  {
    id: "task-machine",
    title: "Task Machine",
    description: "Complete 50 tasks",
    icon: Cog,
    points: 400,
    requirement: { type: "tasks_completed", count: 50 },
    rarity: "uncommon"
  },
  {
    id: "xp-collector",
    title: "XP Collector",
    description: "Earn 2,500 XP",
    icon: Gem,
    points: 300,
    requirement: { type: "points_earned", count: 2500 },
    rarity: "uncommon"
  },
  {
    id: "month-long",
    title: "Month Long",
    description: "Complete tasks for 30 days",
    icon: Calendar,
    points: 750,
    requirement: { type: "active_days", count: 30 },
    rarity: "uncommon"
  },

  // Streak Achievements (Uncommon)
  {
    id: "streak-warrior",
    title: "Streak Warrior",
    description: "Maintain a 30-day learning streak",
    icon: Flame,
    points: 750,
    requirement: { type: "streak", count: 30 },
    rarity: "uncommon"
  },
  {
    id: "streak-champion",
    title: "Streak Champion",
    description: "Maintain a 45-day learning streak",
    icon: Flame,
    points: 1000,
    requirement: { type: "streak", count: 45 },
    rarity: "uncommon"
  },
  {
    id: "streak-legend",
    title: "Streak Legend",
    description: "Maintain a 60-day learning streak",
    icon: Flame,
    points: 1250,
    requirement: { type: "streak", count: 60 },
    rarity: "uncommon"
  },

  // Category Progress (Uncommon)
  {
    id: "money-enthusiast",
    title: "Money Enthusiast",
    description: "Complete 5 Money & Finance guides",
    icon: DollarSign,
    points: 300,
    requirement: { type: "category_progress", category: "money-finance", count: 5 },
    rarity: "uncommon"
  },
  {
    id: "health-advocate",
    title: "Health Advocate",
    description: "Complete 5 Health & Wellness guides",
    icon: Heart,
    points: 300,
    requirement: { type: "category_progress", category: "health", count: 5 },
    rarity: "uncommon"
  },
  {
    id: "skill-builder",
    title: "Skill Builder",
    description: "Complete 5 Life Skills guides",
    icon: Wrench,
    points: 300,
    requirement: { type: "category_progress", category: "life-skills", count: 5 },
    rarity: "uncommon"
  },
  {
    id: "career-climber",
    title: "Career Climber",
    description: "Complete 5 Career & Education guides",
    icon: Briefcase,
    points: 300,
    requirement: { type: "category_progress", category: "career", count: 5 },
    rarity: "uncommon"
  },
  {
    id: "social-connector",
    title: "Social Connector",
    description: "Complete 5 Social & Relationships guides",
    icon: Users,
    points: 300,
    requirement: { type: "category_progress", category: "social", count: 5 },
    rarity: "uncommon"
  },

  // Special Achievements (Uncommon)
  {
    id: "speed-demon",
    title: "Speed Demon",
    description: "Complete 5 guides in one day",
    icon: Zap,
    points: 400,
    requirement: { type: "guides_in_day", count: 5 },
    rarity: "uncommon"
  },
  {
    id: "task-tornado",
    title: "Task Tornado",
    description: "Complete 10 tasks in one day",
    icon: Tornado,
    points: 350,
    requirement: { type: "tasks_in_day", count: 10 },
    rarity: "uncommon"
  },
  {
    id: "weekend-grinder",
    title: "Weekend Grinder",
    description: "Complete tasks on 10 weekends",
    icon: Calendar,
    points: 400,
    requirement: { type: "weekend_active", count: 10 },
    rarity: "uncommon"
  },
  {
    id: "morning-person",
    title: "Morning Person",
    description: "Complete 10 tasks before 9 AM",
    icon: Sunrise,
    points: 300,
    requirement: { type: "early_completion", count: 10 },
    rarity: "uncommon"
  },
  {
    id: "night-grinder",
    title: "Night Grinder",
    description: "Complete 10 tasks after 9 PM",
    icon: Moon,
    points: 300,
    requirement: { type: "late_completion", count: 10 },
    rarity: "uncommon"
  },
  {
    id: "category-explorer",
    title: "Category Explorer",
    description: "Complete guides from all 5 categories",
    icon: Compass,
    points: 500,
    requirement: { type: "all_categories_touched", count: 5 },
    rarity: "uncommon"
  },
  {
    id: "balanced-achiever",
    title: "Balanced Achiever",
    description: "Complete at least 3 guides in 4 categories",
    icon: Scale,
    points: 400,
    requirement: { type: "balanced_progress", count: 4 },
    rarity: "uncommon"
  },
  {
    id: "comeback-kid",
    title: "Comeback Kid",
    description: "Restart your streak after losing a 7+ day streak",
    icon: RotateCcw,
    points: 300,
    requirement: { type: "streak_recovery", count: 1 },
    rarity: "uncommon"
  },
  {
    id: "perfectionist",
    title: "Perfectionist",
    description: "Complete 10 guides with all tasks finished",
    icon: CheckCircle2,
    points: 400,
    requirement: { type: "perfect_guides", count: 10 },
    rarity: "uncommon"
  },
  {
    id: "level-up",
    title: "Level Up",
    description: "Reach Level 5",
    icon: TrendingUp,
    points: 300,
    requirement: { type: "level_reached", count: 5 },
    rarity: "uncommon"
  },
  {
    id: "xp-machine",
    title: "XP Machine",
    description: "Earn 5,000 XP",
    icon: Zap,
    points: 500,
    requirement: { type: "points_earned", count: 5000 },
    rarity: "uncommon"
  },
  {
    id: "task-completionist",
    title: "Task Completionist",
    description: "Complete 100 tasks",
    icon: Target,
    points: 600,
    requirement: { type: "tasks_completed", count: 100 },
    rarity: "uncommon"
  },
  {
    id: "guide-collector",
    title: "Guide Collector",
    description: "Complete 25 guides",
    icon: BookOpen,
    points: 600,
    requirement: { type: "guides_completed", count: 25 },
    rarity: "uncommon"
  },
  {
    id: "two-month-streak",
    title: "Two Month Streak",
    description: "Complete tasks for 60 days",
    icon: Calendar,
    points: 1000,
    requirement: { type: "active_days", count: 60 },
    rarity: "uncommon"
  },
  {
    id: "category-dabbler",
    title: "Category Dabbler",
    description: "Complete at least 1 guide in all 5 categories",
    icon: Grid3X3,
    points: 350,
    requirement: { type: "categories_touched", count: 5 },
    rarity: "uncommon"
  },
  {
    id: "habit-former",
    title: "Habit Former",
    description: "Complete tasks on 21 consecutive days",
    icon: Repeat,
    points: 500,
    requirement: { type: "streak", count: 21 },
    rarity: "uncommon"
  },
  {
    id: "productivity-pro",
    title: "Productivity Pro",
    description: "Complete 15 tasks in one day",
    icon: Gauge,
    points: 500,
    requirement: { type: "tasks_in_day", count: 15 },
    rarity: "uncommon"
  },

  // ===== RARE ACHIEVEMENTS (20 total) =====
  // Category Masters
  {
    id: "money-master",
    title: "Money Master",
    description: "Complete all Money & Finance guides",
    icon: Crown,
    points: 1000,
    requirement: { type: "category_completed", category: "money-finance" },
    rarity: "rare"
  },
  {
    id: "health-hero",
    title: "Health Hero",
    description: "Complete all Health & Wellness guides",
    icon: Award,
    points: 1000,
    requirement: { type: "category_completed", category: "health" },
    rarity: "rare"
  },
  {
    id: "life-skills-legend",
    title: "Life Skills Legend",
    description: "Complete all Life Skills guides",
    icon: Medal,
    points: 1000,
    requirement: { type: "category_completed", category: "life-skills" },
    rarity: "rare"
  },
  {
    id: "career-champion",
    title: "Career Champion",
    description: "Complete all Career & Education guides",
    icon: Trophy,
    points: 1000,
    requirement: { type: "category_completed", category: "career" },
    rarity: "rare"
  },
  {
    id: "social-sage",
    title: "Social Sage",
    description: "Complete all Social & Relationships guides",
    icon: Crown,
    points: 1000,
    requirement: { type: "category_completed", category: "social" },
    rarity: "rare"
  },

  // High Achievement Milestones
  {
    id: "guide-master",
    title: "Guide Master",
    description: "Complete 50 guides",
    icon: BookOpen,
    points: 1200,
    requirement: { type: "guides_completed", count: 50 },
    rarity: "rare"
  },
  {
    id: "task-overlord",
    title: "Task Overlord",
    description: "Complete 250 tasks",
    icon: Crown,
    points: 1000,
    requirement: { type: "tasks_completed", count: 250 },
    rarity: "rare"
  },
  {
    id: "xp-master",
    title: "XP Master",
    description: "Earn 10,000 XP",
    icon: Star,
    points: 750,
    requirement: { type: "points_earned", count: 10000 },
    rarity: "rare"
  },
  {
    id: "level-master",
    title: "Level Master",
    description: "Reach Level 10",
    icon: Crown,
    points: 800,
    requirement: { type: "level_reached", count: 10 },
    rarity: "rare"
  },

  // Streak Masters (Rare)
  {
    id: "streak-master",
    title: "Streak Master",
    description: "Maintain a 90-day learning streak",
    icon: Flame,
    points: 2000,
    requirement: { type: "streak", count: 90 },
    rarity: "rare"
  },
  {
    id: "streak-god",
    title: "Streak God",
    description: "Maintain a 180-day learning streak",
    icon: Flame,
    points: 3000,
    requirement: { type: "streak", count: 180 },
    rarity: "rare"
  },

  // Special Rare Achievements
  {
    id: "speed-master",
    title: "Speed Master",
    description: "Complete 10 guides in one day",
    icon: Bolt,
    points: 1000,
    requirement: { type: "guides_in_day", count: 10 },
    rarity: "rare"
  },
  {
    id: "task-hurricane",
    title: "Task Hurricane",
    description: "Complete 25 tasks in one day",
    icon: Tornado,
    points: 800,
    requirement: { type: "tasks_in_day", count: 25 },
    rarity: "rare"
  },
  {
    id: "three-month-grind",
    title: "Three Month Grind",
    description: "Complete tasks for 90 days",
    icon: Calendar,
    points: 1500,
    requirement: { type: "active_days", count: 90 },
    rarity: "rare"
  },
  {
    id: "perfect-month",
    title: "Perfect Month",
    description: "Complete tasks every day for 30 days",
    icon: CheckCircle2,
    points: 1200,
    requirement: { type: "perfect_month", count: 1 },
    rarity: "rare"
  },
  {
    id: "category-perfectionist",
    title: "Category Perfectionist",
    description: "Complete all guides in 3 categories",
    icon: Award,
    points: 1500,
    requirement: { type: "categories_mastered", count: 3 },
    rarity: "rare"
  },
  {
    id: "comeback-champion",
    title: "Comeback Champion",
    description: "Restart your streak 5 times after losing 14+ day streaks",
    icon: Phoenix,
    points: 1000,
    requirement: { type: "streak_recovery", count: 5 },
    rarity: "rare"
  },
  {
    id: "weekend-legend",
    title: "Weekend Legend",
    description: "Complete tasks on 25 weekends",
    icon: Calendar,
    points: 800,
    requirement: { type: "weekend_active", count: 25 },
    rarity: "rare"
  },
  {
    id: "early-legend",
    title: "Early Legend",
    description: "Complete 50 tasks before 9 AM",
    icon: Sunrise,
    points: 750,
    requirement: { type: "early_completion", count: 50 },
    rarity: "rare"
  },
  {
    id: "night-legend",
    title: "Night Legend",
    description: "Complete 50 tasks after 9 PM",
    icon: Moon,
    points: 750,
    requirement: { type: "late_completion", count: 50 },
    rarity: "rare"
  },

  // ===== EPIC ACHIEVEMENTS (7 total) =====
  {
    id: "guide-legend",
    title: "Guide Legend",
    description: "Complete 75 guides",
    icon: Crown,
    points: 2000,
    requirement: { type: "guides_completed", count: 75 },
    rarity: "epic"
  },
  {
    id: "task-emperor",
    title: "Task Emperor",
    description: "Complete 500 tasks",
    icon: Crown,
    points: 1800,
    requirement: { type: "tasks_completed", count: 500 },
    rarity: "epic"
  },
  {
    id: "xp-legend",
    title: "XP Legend",
    description: "Earn 25,000 XP",
    icon: Star,
    points: 1500,
    requirement: { type: "points_earned", count: 25000 },
    rarity: "epic"
  },
  {
    id: "streak-immortal",
    title: "Streak Immortal",
    description: "Maintain a 365-day learning streak",
    icon: Flame,
    points: 5000,
    requirement: { type: "streak", count: 365 },
    rarity: "epic"
  },
  {
    id: "category-god",
    title: "Category God",
    description: "Complete all guides in 4 categories",
    icon: Crown,
    points: 2500,
    requirement: { type: "categories_mastered", count: 4 },
    rarity: "epic"
  },
  {
    id: "level-legend",
    title: "Level Legend",
    description: "Reach Level 20",
    icon: Star,
    points: 1500,
    requirement: { type: "level_reached", count: 20 },
    rarity: "epic"
  },
  {
    id: "year-long-grind",
    title: "Year Long Grind",
    description: "Complete tasks for 365 days",
    icon: Calendar,
    points: 3000,
    requirement: { type: "active_days", count: 365 },
    rarity: "epic"
  },

  // ===== LEGENDARY ACHIEVEMENTS (10 total) =====
  {
    id: "adulting-champion",
    title: "Adulting Champion",
    description: "Complete all guides in all 5 categories",
    icon: Trophy,
    points: 5000,
    requirement: { type: "categories_mastered", count: 5 },
    rarity: "legendary"
  },
  {
    id: "guide-god",
    title: "Guide God",
    description: "Complete 100 guides",
    icon: Crown,
    points: 3000,
    requirement: { type: "guides_completed", count: 100 },
    rarity: "legendary"
  },
  {
    id: "task-deity",
    title: "Task Deity",
    description: "Complete 1,000 tasks",
    icon: Crown,
    points: 2500,
    requirement: { type: "tasks_completed", count: 1000 },
    rarity: "legendary"
  },
  {
    id: "xp-god",
    title: "XP God",
    description: "Earn 50,000 XP",
    icon: Star,
    points: 2000,
    requirement: { type: "points_earned", count: 50000 },
    rarity: "legendary"
  },
  {
    id: "streak-eternal",
    title: "Streak Eternal",
    description: "Maintain a 500-day learning streak",
    icon: Flame,
    points: 7500,
    requirement: { type: "streak", count: 500 },
    rarity: "legendary"
  },
  {
    id: "level-god",
    title: "Level God",
    description: "Reach Level 50",
    icon: Crown,
    points: 3000,
    requirement: { type: "level_reached", count: 50 },
    rarity: "legendary"
  },
  {
    id: "perfect-year",
    title: "Perfect Year",
    description: "Complete tasks every day for 365 days",
    icon: CheckCircle2,
    points: 10000,
    requirement: { type: "perfect_year", count: 1 },
    rarity: "legendary"
  },
  {
    id: "speed-god",
    title: "Speed God",
    description: "Complete 25 guides in one day",
    icon: Bolt,
    points: 5000,
    requirement: { type: "guides_in_day", count: 25 },
    rarity: "legendary"
  },
  {
    id: "task-storm",
    title: "Task Storm",
    description: "Complete 100 tasks in one day",
    icon: Tornado,
    points: 4000,
    requirement: { type: "tasks_in_day", count: 100 },
    rarity: "legendary"
  },
  {
    id: "the-chosen-one",
    title: "The Chosen One",
    description: "Unlock all other achievements",
    icon: Crown,
    points: 10000,
    requirement: { type: "all_achievements", count: 1 },
    rarity: "legendary"
  }
];

// Financial Benchmarking System
// Based on real financial data for different age groups
const FINANCIAL_BENCHMARKS = {
  "16-18": {
    income: {
      percentiles: { 10: 0, 25: 0, 50: 2000, 75: 5000, 90: 8000 }, // Annual part-time income
      label: "Annual Income (Part-time)"
    },
    savings: {
      percentiles: { 10: 0, 25: 100, 50: 500, 75: 1500, 90: 3000 },
      label: "Total Savings"
    },
    checking: {
      percentiles: { 10: 0, 25: 50, 50: 300, 75: 800, 90: 1500 },
      label: "Checking Account Balance"
    },
    creditScore: {
      percentiles: { 10: 0, 25: 0, 50: 0, 75: 650, 90: 700 }, // Most don't have credit yet
      label: "Credit Score"
    },
    debt: {
      percentiles: { 10: 0, 25: 0, 50: 0, 75: 500, 90: 1200 }, // Minimal debt
      label: "Total Debt"
    }
  },
  "19-22": {
    income: {
      percentiles: { 10: 0, 25: 8000, 50: 15000, 75: 25000, 90: 35000 }, // College/entry jobs
      label: "Annual Income"
    },
    savings: {
      percentiles: { 10: 0, 25: 200, 50: 1000, 75: 3000, 90: 6000 },
      label: "Total Savings"
    },
    checking: {
      percentiles: { 10: 50, 25: 200, 50: 600, 75: 1500, 90: 3000 },
      label: "Checking Account Balance"
    },
    creditScore: {
      percentiles: { 10: 0, 25: 600, 50: 650, 75: 700, 90: 750 },
      label: "Credit Score"
    },
    debt: {
      percentiles: { 10: 0, 25: 2000, 50: 8000, 75: 20000, 90: 35000 }, // Student loans
      label: "Total Debt"
    }
  },
  "23-26": {
    income: {
      percentiles: { 10: 20000, 25: 30000, 50: 45000, 75: 65000, 90: 85000 }, // Early career
      label: "Annual Income"
    },
    savings: {
      percentiles: { 10: 500, 25: 2000, 50: 5000, 75: 12000, 90: 25000 },
      label: "Total Savings"
    },
    checking: {
      percentiles: { 10: 200, 25: 800, 50: 2000, 75: 4000, 90: 7000 },
      label: "Checking Account Balance"
    },
    creditScore: {
      percentiles: { 10: 580, 25: 650, 50: 700, 75: 750, 90: 800 },
      label: "Credit Score"
    },
    debt: {
      percentiles: { 10: 1000, 25: 8000, 50: 18000, 75: 30000, 90: 50000 },
      label: "Total Debt"
    }
  },
  "27-30": {
    income: {
      percentiles: { 10: 30000, 25: 45000, 50: 60000, 75: 85000, 90: 120000 }, // Established career
      label: "Annual Income"
    },
    savings: {
      percentiles: { 10: 1000, 25: 5000, 50: 15000, 75: 35000, 90: 65000 },
      label: "Total Savings"
    },
    checking: {
      percentiles: { 10: 500, 25: 1500, 50: 4000, 75: 8000, 90: 15000 },
      label: "Checking Account Balance"
    },
    creditScore: {
      percentiles: { 10: 620, 25: 680, 50: 720, 75: 760, 90: 800 },
      label: "Credit Score"
    },
    debt: {
      percentiles: { 10: 2000, 25: 12000, 50: 25000, 75: 45000, 90: 80000 },
      label: "Total Debt"
    }
  }
};

// Financial Assessment System
const useFinancialAssessment = () => {
  const [financialData, setFinancialData] = useState(() => {
    const saved = localStorage.getItem('growup-financial-data');
    return saved ? JSON.parse(saved) : {
      age: null,
      income: null,
      savings: null,
      checking: null,
      creditScore: null,
      debt: null,
      hasAssessment: false,
      lastUpdated: null
    };
  });

  const saveFinancialData = (data) => {
    const updatedData = {
      ...financialData,
      ...data,
      hasAssessment: true,
      lastUpdated: new Date().toISOString()
    };
    setFinancialData(updatedData);
    localStorage.setItem('growup-financial-data', JSON.stringify(updatedData));
  };

  const getAgeGroup = (age) => {
    if (age >= 16 && age <= 18) return "16-18";
    if (age >= 19 && age <= 22) return "19-22";
    if (age >= 23 && age <= 26) return "23-26";
    if (age >= 27 && age <= 30) return "27-30";
    return "23-26"; // Default fallback
  };

  const calculatePercentile = (value, benchmarks) => {
    if (value === null || value === undefined) return null;
    
    const percentiles = benchmarks.percentiles;
    if (value <= percentiles[10]) return 10;
    if (value <= percentiles[25]) return 25;
    if (value <= percentiles[50]) return 50;
    if (value <= percentiles[75]) return 75;
    if (value <= percentiles[90]) return 90;
    return 95; // Top 5%
  };

  const getFinancialComparison = () => {
    if (!financialData.hasAssessment) return null;

    const ageGroup = getAgeGroup(financialData.age);
    const benchmarks = FINANCIAL_BENCHMARKS[ageGroup];
    
    return {
      income: {
        value: financialData.income,
        percentile: calculatePercentile(financialData.income, benchmarks.income),
        benchmark: benchmarks.income,
        label: benchmarks.income.label
      },
      savings: {
        value: financialData.savings,
        percentile: calculatePercentile(financialData.savings, benchmarks.savings),
        benchmark: benchmarks.savings,
        label: benchmarks.savings.label
      },
      checking: {
        value: financialData.checking,
        percentile: calculatePercentile(financialData.checking, benchmarks.checking),
        benchmark: benchmarks.checking,
        label: benchmarks.checking.label
      },
      creditScore: {
        value: financialData.creditScore,
        percentile: calculatePercentile(financialData.creditScore, benchmarks.creditScore),
        benchmark: benchmarks.creditScore,
        label: benchmarks.creditScore.label
      },
      debt: {
        value: financialData.debt,
        percentile: 100 - (calculatePercentile(financialData.debt, benchmarks.debt) || 0), // Lower debt = higher percentile
        benchmark: benchmarks.debt,
        label: benchmarks.debt.label
      },
      ageGroup: ageGroup
    };
  };

  return {
    financialData,
    saveFinancialData,
    getFinancialComparison,
    hasAssessment: financialData.hasAssessment
  };
};

// Progress system stored in Firestore per user; falls back to local for guest
const useGameProgress = () => {
  const [uid, setUid] = useState(() => (typeof window !== 'undefined' && (auth?.currentUser?.uid || 'guest')));
  useEffect(() => {
    const unsub = listenToAuth?.((u) => setUid(u?.uid || 'guest'));
    return () => { if (unsub) unsub(); };
  }, []);
  const storageKey = `growup-progress-${uid || 'guest'}`;

  const defaultProgress = {
      completedGuides: [],
      completedTasks: [],
      totalPoints: 0,
      currentStreak: 0,
      lastActivityDate: null,
      unlockedAchievements: [],
      categoryProgress: {},
      dailyActivity: {} // { "2024-01-15": { tasks: 3, guides: 1, points: 80 } }
    };

  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultProgress;
  });

  // Reload progress when the signed-in user changes
  useEffect(() => {
    // If guest, use localStorage; else subscribe to Firestore doc
    if (!uid || uid === 'guest') {
      const saved = localStorage.getItem(storageKey);
      setProgress(saved ? JSON.parse(saved) : defaultProgress);
      return;
    }
    const ref = doc(db, 'users', uid, 'data', 'progress');
    let cancelled = false;
    const unsub = onSnapshot(ref, async (snap) => {
      if (cancelled) return;
      if (snap.exists()) {
        const data = snap.data();
        setProgress({ ...defaultProgress, ...data });
      } else {
        await setDoc(ref, defaultProgress, { merge: true });
        setProgress(defaultProgress);
      }
    });
    return () => { cancelled = true; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const saveProgress = async (newProgress) => {
    setProgress(newProgress);
    if (uid && uid !== 'guest') {
      const ref = doc(db, 'users', uid, 'data', 'progress');
      await setDoc(ref, newProgress, { merge: true });
    } else {
      localStorage.setItem(storageKey, JSON.stringify(newProgress));
    }
  };

  // Helper function to calculate current streak from daily activity
  const calculateStreak = (dailyActivity) => {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    // Check consecutive days backwards from today
    while (true) {
      const dateStr = currentDate.toDateString();
      if (dailyActivity[dateStr] && (dailyActivity[dateStr].tasks > 0 || dailyActivity[dateStr].guides > 0)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  // Helper function to update daily activity
  const updateDailyActivity = (progress, pointsEarned = 0, tasksCompleted = 0, guidesCompleted = 0) => {
    const today = new Date().toDateString();
    const currentActivity = progress.dailyActivity[today] || { tasks: 0, guides: 0, points: 0 };
    
    const updatedActivity = {
      ...progress.dailyActivity,
      [today]: {
        tasks: currentActivity.tasks + tasksCompleted,
        guides: currentActivity.guides + guidesCompleted,
        points: currentActivity.points + pointsEarned
      }
    };
    
    return {
      ...progress,
      dailyActivity: updatedActivity,
      currentStreak: calculateStreak(updatedActivity),
      lastActivityDate: today
    };
  };

  const completeGuide = (guideTitle, categoryKey) => {
    const pointsEarned = DETAILED_GUIDES[categoryKey]?.find(g => g.title === guideTitle)?.difficulty === 'Beginner' ? 50 : 
                        DETAILED_GUIDES[categoryKey]?.find(g => g.title === guideTitle)?.difficulty === 'Intermediate' ? 75 : 100;
    
    let newProgress = {
      ...progress,
      completedGuides: [...new Set([...progress.completedGuides, guideTitle])],
      totalPoints: progress.totalPoints + pointsEarned,
      categoryProgress: {
        ...progress.categoryProgress,
        [categoryKey]: (progress.categoryProgress[categoryKey] || 0) + 1
      }
    };

    // Update daily activity and streak
    newProgress = updateDailyActivity(newProgress, pointsEarned, 0, 1);

    // Check for new achievements
    const newAchievements = ACHIEVEMENTS.filter(achievement => {
      if (newProgress.unlockedAchievements.includes(achievement.id)) return false;
      
      switch(achievement.requirement.type) {
        case "guides_completed":
          return newProgress.completedGuides.length >= achievement.requirement.count;
        case "tasks_completed":
          return newProgress.completedTasks.length >= achievement.requirement.count;
        case "points_earned":
          return newProgress.totalPoints >= achievement.requirement.count;
        case "category_completed":
          const categoryGuides = DETAILED_GUIDES[achievement.requirement.category] || [];
          return newProgress.categoryProgress[achievement.requirement.category] >= categoryGuides.length;
        case "category_started":
          return (newProgress.categoryProgress[achievement.requirement.category] || 0) >= 1;
        case "category_progress":
          return (newProgress.categoryProgress[achievement.requirement.category] || 0) >= achievement.requirement.count;
        case "all_categories_touched":
          return Object.keys(newProgress.categoryProgress).length >= achievement.requirement.count;
        case "categories_touched":
          return Object.keys(newProgress.categoryProgress).length >= achievement.requirement.count;
        case "categories_mastered":
          const masteredCount = Object.keys(newProgress.categoryProgress).filter(cat => {
            const categoryGuides = DETAILED_GUIDES[cat] || [];
            return newProgress.categoryProgress[cat] >= categoryGuides.length;
          }).length;
          return masteredCount >= achievement.requirement.count;
        case "balanced_progress":
          const categoriesWithMinGuides = Object.keys(newProgress.categoryProgress).filter(cat => 
            newProgress.categoryProgress[cat] >= achievement.requirement.count
          ).length;
          return categoriesWithMinGuides >= achievement.requirement.count;
        case "streak":
          return newProgress.currentStreak >= achievement.requirement.count;
        case "active_days":
          return Object.keys(newProgress.dailyActivity || {}).length >= achievement.requirement.count;
        case "level_reached":
          const level = Math.floor(newProgress.totalPoints / 500) + 1;
          return level >= achievement.requirement.count;
        case "guides_in_day":
        case "tasks_in_day":
        case "weekend_active":
        case "early_completion":
        case "late_completion":
        case "perfect_guides":
        case "streak_recovery":
        case "perfect_month":
        case "perfect_year":
        case "all_achievements":
          // These require more complex tracking - implement later
          return false;
        default:
          return false;
      }
    });

    if (newAchievements.length > 0) {
      newProgress.unlockedAchievements = [...newProgress.unlockedAchievements, ...newAchievements.map(a => a.id)];
      newProgress.totalPoints += newAchievements.reduce((sum, a) => sum + a.points, 0);
    }

    saveProgress(newProgress);
    return newAchievements;
  };

  const getCategoryProgress = (categoryKey) => {
    const completed = progress.categoryProgress[categoryKey] || 0;
    const total = DETAILED_GUIDES[categoryKey]?.length || 0;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const getLevel = () => {
    const level = Math.floor(progress.totalPoints / 500) + 1;
    const pointsToNext = 500 - (progress.totalPoints % 500);
    return { level, pointsToNext, progress: (progress.totalPoints % 500) / 500 * 100 };
  };

  const toggleTask = (taskId, guideTitle) => {
    const isCompleted = progress.completedTasks.includes(taskId);
    const pointsChange = isCompleted ? -10 : 10;
    const taskChange = isCompleted ? -1 : 1;
    
    let newProgress = {
      ...progress,
      completedTasks: isCompleted 
        ? progress.completedTasks.filter(id => id !== taskId)
        : [...progress.completedTasks, taskId],
      totalPoints: progress.totalPoints + pointsChange
    };

    // Update daily activity and streak (only for completing tasks, not uncompleting)
    if (!isCompleted) {
      newProgress = updateDailyActivity(newProgress, pointsChange, taskChange, 0);
    } else {
      // For uncompleting, just update the date but don't affect daily activity tracking
      newProgress.lastActivityDate = new Date().toDateString();
    }

    // Check if any guide should be auto-completed after this task change
    const autoCompletedGuides = [];
    
    // If we just completed a task (not uncompleted), check for guide completion
    if (!isCompleted && guideTitle) {
      // Find the guide and check if all its tasks are now complete
      const allGuides = Object.values(DETAILED_GUIDES).flat();
      const guide = allGuides.find(g => g.title === guideTitle);
      
      if (guide && guide.tasks) {
        const guideTaskIds = guide.tasks.map(task => task.id);
        const completedGuideTaskIds = newProgress.completedTasks.filter(taskId => guideTaskIds.includes(taskId));
        
        // If all tasks are complete and guide isn't already marked complete
        if (completedGuideTaskIds.length === guide.tasks.length && !newProgress.completedGuides.includes(guide.title)) {
          // Auto-complete the guide
          const pointsForGuide = guide.difficulty === 'Beginner' ? 50 : guide.difficulty === 'Intermediate' ? 75 : 100;
          newProgress.completedGuides = [...newProgress.completedGuides, guide.title];
          newProgress.totalPoints += pointsForGuide;
          
          // Find category for this guide
          let categoryKey = null;
          for (const [key, guides] of Object.entries(DETAILED_GUIDES)) {
            if (guides.includes(guide)) {
              categoryKey = key;
              break;
            }
          }
          
          if (categoryKey) {
            newProgress.categoryProgress = {
              ...newProgress.categoryProgress,
              [categoryKey]: (newProgress.categoryProgress[categoryKey] || 0) + 1
            };
          }
          
          autoCompletedGuides.push({ guide, pointsEarned: pointsForGuide });
        }
      }
    }

    saveProgress(newProgress);
    return { 
      taskCompleted: !isCompleted, 
      points: isCompleted ? -10 : 10,
      autoCompletedGuides 
    };
  };

  const getGuideProgress = (guide) => {
    if (!guide.tasks) return { completed: 0, total: 0, percentage: 0 };
    
    const completedTasks = guide.tasks.filter(task => 
      progress.completedTasks.includes(task.id)
    ).length;
    
    const totalTasks = guide.tasks.length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    return { completed: completedTasks, total: totalTasks, percentage };
  };

  const isTaskCompleted = (taskId) => {
    return progress.completedTasks.includes(taskId);
  };

  return {
    progress,
    completeGuide,
    getCategoryProgress,
    getLevel,
    saveProgress,
    toggleTask,
    getGuideProgress,
    isTaskCompleted
  };
};

// -----------------------------
// Search Functionality
// -----------------------------
const getAllGuides = () => {
  const allGuides = [];
  Object.entries(DETAILED_GUIDES).forEach(([categoryKey, guides]) => {
    const category = CATEGORIES.find(c => c.key === categoryKey);
    guides.forEach(guide => {
      allGuides.push({
        ...guide,
        categoryKey,
        categoryName: category?.name || '',
        categoryColor: category?.color || 'from-gray-400 to-gray-500'
      });
    });
  });
  return allGuides;
};

const searchGuides = (query) => {
  if (!query.trim()) return [];
  
  const normalize = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
  const slugify = (s) => normalize(s).replace(/\s+/g, '-');

  const SYNONYMS = {
    bank: ['banking', 'checking', 'savings', 'account'],
    credit: ['credit card', 'card', 'score', 'fico'],
    doctor: ['pcp', 'primary care', 'physician'],
    budget: ['budgeting', 'spending plan'],
    apartment: ['rent', 'lease', 'housing'],
  };

  // Expand query with synonyms
  const qNorm = normalize(query);
  const tokens = qNorm.split(' ');
  const expandedTokens = new Set(tokens);
  tokens.forEach((t) => {
    const syns = SYNONYMS[t];
    if (syns) syns.forEach((w) => expandedTokens.add(normalize(w)));
  });

  const allGuides = getAllGuides();

  const scored = allGuides.map((g) => {
    const title = normalize(g.title);
    const titleSlug = slugify(g.title);
    const summary = normalize(g.summary || '');
    const category = normalize(g.categoryName || '');
    const steps = (g.steps || []).map(normalize).join(' ');

    let score = 0;
    expandedTokens.forEach((t) => {
      if (!t) return;
      if (title === t) score += 6; // exact title
      if (title.includes(t)) score += 3; // partial title
      if (summary.includes(t)) score += 2;
      if (category.includes(t)) score += 2;
      if (steps.includes(t)) score += 1;
      if (titleSlug.includes(t)) score += 3; // slug match
    });

    // Boost if any token is a prefix
    expandedTokens.forEach((t) => {
      if (title.startsWith(t)) score += 1;
    });

    return { guide: g, score };
  })
  .filter((x) => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .map((x) => x.guide);

  return scored;
};

// Age-based milestone system
const AGE_MILESTONES = {
  "16-18": {
    label: "High School (16-18)",
    description: "Building foundation skills for independence",
    milestones: [
      { task: "Get a part-time job or internship", priority: "high", category: "career" },
      { task: "Learn basic banking (checking account)", priority: "high", category: "finance" },
      { task: "Practice cooking 5 basic meals", priority: "medium", category: "life-skills" },
      { task: "Understand health insurance basics", priority: "medium", category: "health" },
      { task: "Learn to do your own laundry", priority: "medium", category: "life-skills" },
      { task: "Start building credit (authorized user)", priority: "low", category: "finance" }
    ],
    nextStage: "Prepare for college or workforce entry"
  },
  "19-22": {
    label: "College/Early Career (19-22)",
    description: "Developing independence and professional skills",
    milestones: [
      { task: "Establish independent banking", priority: "high", category: "finance" },
      { task: "Build credit with first credit card", priority: "high", category: "finance" },
      { task: "Learn basic budgeting and expense tracking", priority: "high", category: "finance" },
      { task: "Find primary care doctor", priority: "high", category: "health" },
      { task: "Develop professional network", priority: "medium", category: "career" },
      { task: "Master apartment hunting and renting", priority: "medium", category: "living" },
      { task: "Build emergency fund ($1000)", priority: "medium", category: "finance" }
    ],
    nextStage: "Transition to full independence and career building"
  },
  "23-26": {
    label: "Early Career (23-26)",
    description: "Establishing career and financial foundation",
    milestones: [
      { task: "Secure stable full-time employment", priority: "high", category: "career" },
      { task: "Live independently (own lease)", priority: "high", category: "living" },
      { task: "Build 3-month emergency fund", priority: "high", category: "finance" },
      { task: "Start retirement savings (401k)", priority: "high", category: "finance" },
      { task: "Understand and optimize credit score", priority: "medium", category: "finance" },
      { task: "Develop cooking and meal planning skills", priority: "medium", category: "life-skills" },
      { task: "Consider additional education/certifications", priority: "low", category: "career" }
    ],
    nextStage: "Build wealth and consider major life decisions"
  },
  "27-30": {
    label: "Late Twenties (27-30)",
    description: "Building wealth and making major life decisions",
    milestones: [
      { task: "Achieve 6-month emergency fund", priority: "high", category: "finance" },
      { task: "Save 15%+ for retirement", priority: "high", category: "finance" },
      { task: "Consider homeownership vs renting", priority: "medium", category: "living" },
      { task: "Advance in career or change fields", priority: "medium", category: "career" },
      { task: "Build investment portfolio", priority: "medium", category: "finance" },
      { task: "Consider life insurance needs", priority: "low", category: "finance" },
      { task: "Plan for major life goals", priority: "low", category: "personal" }
    ],
    nextStage: "Optimize wealth building and life planning"
  },
  "31-35": {
    label: "Early Thirties (31-35)",
    description: "Peak earning and major life commitments",
    milestones: [
      { task: "Consider homeownership seriously", priority: "high", category: "living" },
      { task: "Maximize retirement contributions", priority: "high", category: "finance" },
      { task: "Build substantial investment portfolio", priority: "medium", category: "finance" },
      { task: "Consider family planning finances", priority: "medium", category: "finance" },
      { task: "Optimize career for peak earning", priority: "medium", category: "career" },
      { task: "Plan estate basics (will, beneficiaries)", priority: "low", category: "finance" }
    ],
    nextStage: "Wealth accumulation and family considerations"
  },
  "36+": {
    label: "Established Adult (36+)",
    description: "Wealth preservation and legacy planning",
    milestones: [
      { task: "Own home or have clear housing plan", priority: "high", category: "living" },
      { task: "Have substantial retirement savings", priority: "high", category: "finance" },
      { task: "Consider college savings (if applicable)", priority: "medium", category: "finance" },
      { task: "Optimize tax strategies", priority: "medium", category: "finance" },
      { task: "Plan for aging parents", priority: "medium", category: "personal" },
      { task: "Estate planning and insurance review", priority: "low", category: "finance" }
    ],
    nextStage: "Legacy and retirement planning"
  }
};

const COMPREHENSIVE_QUIZ = [
  {
    key: "age",
    category: "Background",
    q: "What's your age range?",
    options: [
      { value: "16-18", label: "16-18 (High school age)" },
      { value: "19-22", label: "19-22 (College/early career)" },
      { value: "23-26", label: "23-26 (Early career building)" },
      { value: "27-30", label: "27-30 (Late twenties)" },
      { value: "31-35", label: "31-35 (Early thirties)" },
      { value: "36+", label: "36+ (Established adult)" }
    ],
    weight: 5
  },
  {
    key: "life_stage",
    category: "Background",
    q: "What best describes your current situation?",
    options: [
      { value: "high_school", label: "High school student (planning for adulthood)" },
      { value: "college", label: "College student (learning independence)" },
      { value: "new_grad", label: "Recent graduate (entering workforce)" },
      { value: "young_adult", label: "Young adult (figuring things out)" },
      { value: "career_focused", label: "Career-focused (climbing the ladder)" },
      { value: "life_planning", label: "Life planning (house, family, major goals)" },
      { value: "established", label: "Established adult (optimizing and planning ahead)" }
    ],
    weight: 4
  },
  {
    key: "income_status",
    category: "Finance",
    q: "What's your current income situation?",
    options: [
      { value: "no_income", label: "No regular income (student/unemployed)" },
      { value: "part_time", label: "Part-time work or gig economy" },
      { value: "entry_level", label: "Entry-level full-time job" },
      { value: "stable", label: "Stable career with steady income" },
      { value: "variable", label: "Variable income (freelance/commission)" }
    ],
    weight: 3
  },
  {
    key: "banking",
    category: "Finance",
    q: "How would you describe your banking situation?",
    options: [
      { value: "no_account", label: "Don't have my own bank account" },
      { value: "basic", label: "Have checking account, that's it" },
      { value: "savings", label: "Have checking and savings accounts" },
      { value: "advanced", label: "Multiple accounts, credit cards, investments" },
      { value: "unsure", label: "Not sure what I need" }
    ],
    weight: 2
  },
  {
    key: "budgeting",
    category: "Finance",
    q: "How do you currently manage your money?",
    options: [
      { value: "no_tracking", label: "Don't track spending at all" },
      { value: "mental", label: "Keep rough track in my head" },
      { value: "basic_app", label: "Use banking app to check balance" },
      { value: "spreadsheet", label: "Track with spreadsheet or app" },
      { value: "detailed", label: "Detailed budget with categories and goals" }
    ],
    weight: 3
  },
  {
    key: "primary_care",
    category: "Health",
    q: "Do you have a primary care doctor?",
    options: [
      { value: "yes_regular", label: "Yes, and I see them regularly" },
      { value: "yes_no_visits", label: "Yes, but haven't been in a while" },
      { value: "no_but_want", label: "No, but I want to find one" },
      { value: "no_not_priority", label: "No, not a priority right now" },
      { value: "family_doctor", label: "Still use family/pediatric doctor" }
    ],
    weight: 2
  },
  {
    key: "living_situation",
    category: "Housing",
    q: "What's your current living situation?",
    options: [
      { value: "family", label: "Living with family/parents" },
      { value: "dorms", label: "College dorms/student housing" },
      { value: "roommates", label: "Renting with roommates" },
      { value: "solo_rent", label: "Renting alone" },
      { value: "own", label: "Own a home" },
      { value: "looking", label: "Looking for housing" }
    ],
    weight: 2
  },
  {
    key: "cooking_skills",
    category: "Life Skills",
    q: "How would you rate your cooking abilities?",
    options: [
      { value: "cant_cook", label: "Can barely make toast" },
      { value: "basic", label: "Can make simple meals (pasta, eggs)" },
      { value: "intermediate", label: "Can follow recipes and meal prep" },
      { value: "advanced", label: "Comfortable cooking most things" },
      { value: "expert", label: "Love cooking, try new recipes regularly" }
    ],
    weight: 1
  },
  {
    key: "work_situation",
    category: "Career",
    q: "What's your current work/career situation?",
    options: [
      { value: "student", label: "Full-time student, not working" },
      { value: "student_working", label: "Student with part-time job" },
      { value: "job_searching", label: "Looking for work" },
      { value: "new_job", label: "Recently started first 'real' job" },
      { value: "established", label: "Established in my career" },
      { value: "career_change", label: "Considering career change" }
    ],
    weight: 2
  },
  {
    key: "biggest_challenge",
    category: "Goals",
    q: "What feels like your biggest challenge right now?",
    options: [
      { value: "money", label: "Managing money and financial planning" },
      { value: "independence", label: "Becoming more independent from family" },
      { value: "career", label: "Figuring out my career path" },
      { value: "relationships", label: "Building healthy relationships" },
      { value: "health", label: "Taking care of my health" },
      { value: "time", label: "Managing time and being productive" },
      { value: "confidence", label: "Building confidence and self-esteem" }
    ],
    weight: 4
  }
];

// 100% Personalized recommendation engine based on actual quiz answers
function generatePersonalizedRecommendations(answers) {
  console.log('Generating recommendations for answers:', answers);
  
  const age = answers.age?.value;
  const ageGroup = AGE_MILESTONES[age];
  
  if (!ageGroup) {
    return generateBasicRecommendations(answers);
  }

  const profile = analyzeUserProfile(answers);
  const milestoneAnalysis = analyzeMilestoneProgress(answers, ageGroup);
  
  // Generate completely personalized recommendations based on exact answers
  const personalizedTasks = generateAnswerBasedRecommendations(answers, ageGroup);
  
  return {
    ageGroup,
    milestoneAnalysis,
    profile,
    ageBenchmark: generateAgeBenchmark(answers, ageGroup),
    urgentTasks: personalizedTasks.urgent,
    recommendations: personalizedTasks.recommended,
    quickWins: personalizedTasks.quickWins,
    peerComparison: generatePeerComparison(answers, ageGroup)
  };
}

// Generate recommendations based on EXACT quiz answers
function generateAnswerBasedRecommendations(answers, ageGroup) {
  const urgent = [];
  const recommended = [];
  const quickWins = [];
  
  console.log('Analyzing answers for personalized recommendations:', answers);
  
  // Banking situation analysis
  if (answers.banking?.value === 'no_account') {
    urgent.push({
      title: "Open Your First Bank Account",
      reason: `You indicated you don't have a bank account. This is essential for ${ageGroup.label} and financial independence.`,
      category: "money-finance",
      priority: "urgent",
      ageAppropriate: true,
      basedOnAnswer: "No bank account selected"
    });
  } else if (answers.banking?.value === 'basic') {
    recommended.push({
      title: "Add a Savings Account",
      reason: `You have checking but mentioned only basic banking. Adding savings will help you build emergency funds.`,
      category: "money-finance",
      priority: "medium",
      ageAppropriate: true,
      basedOnAnswer: "Basic banking setup"
    });
  }
  
  // Budgeting analysis
  if (answers.budgeting?.value === 'no_tracking') {
    urgent.push({
      title: "Start Tracking Your Spending",
      reason: `You said you don't track spending at all. This is critical for ${ageGroup.label} to avoid debt and build wealth.`,
      category: "money-finance",
      priority: "urgent",
      ageAppropriate: true,
      basedOnAnswer: "No spending tracking"
    });
  } else if (answers.budgeting?.value === 'mental') {
    recommended.push({
      title: "Use a Budgeting App or Spreadsheet",
      reason: `You track spending mentally, but a formal system will help you save more and reach goals faster.`,
      category: "money-finance",
      priority: "medium",
      ageAppropriate: true,
      basedOnAnswer: "Mental tracking only"
    });
  }
  
  // Health care analysis
  if (answers.primary_care?.value === 'no_but_want') {
    urgent.push({
      title: "Find a Primary Care Doctor",
      reason: `You want to find a primary care doctor. This is especially important for ${ageGroup.label} to establish adult healthcare.`,
      category: "health",
      priority: "urgent",
      ageAppropriate: true,
      basedOnAnswer: "Want to find doctor"
    });
  } else if (answers.primary_care?.value === 'family_doctor') {
    recommended.push({
      title: "Transition to Adult Primary Care",
      reason: `You're still using a family/pediatric doctor. Time to find an adult primary care physician.`,
      category: "health",
      priority: "medium",
      ageAppropriate: true,
      basedOnAnswer: "Using family doctor"
    });
  }
  
  // Living situation analysis
  const age = answers.age?.value;
  if (answers.living_situation?.value === 'looking') {
    urgent.push({
      title: "Master Apartment Hunting Process",
      reason: `You're looking for housing. Let's get you prepared with applications, credit checks, and lease knowledge.`,
      category: "living",
      priority: "urgent",
      ageAppropriate: true,
      basedOnAnswer: "Looking for housing"
    });
  } else if (answers.living_situation?.value === 'family') {
    if (age === '23-26' || age === '27-30') {
      recommended.push({
        title: "Plan Your Move to Independence",
        reason: `You're living with family. For ${ageGroup.label}, this is a good time to plan independent living.`,
        category: "living",
        priority: "medium",
        ageAppropriate: true,
        basedOnAnswer: "Living with family"
      });
    }
  }
  
  // Cooking skills analysis
  if (answers.cooking_skills?.value === 'cant_cook') {
    quickWins.push({
      title: "Learn 5 Basic Meals",
      reason: `You said you can barely make toast. Learning basic cooking will save money and improve your health.`,
      category: "life-skills",
      priority: "low",
      ageAppropriate: true,
      basedOnAnswer: "Can't cook"
    });
  } else if (answers.cooking_skills?.value === 'basic') {
    quickWins.push({
      title: "Expand to Meal Planning",
      reason: `You can make simple meals. Next step is meal planning to save time and money.`,
      category: "life-skills",
      priority: "low",
      ageAppropriate: true,
      basedOnAnswer: "Basic cooking skills"
    });
  }
  
  // Work situation analysis
  if (answers.work_situation?.value === 'job_searching') {
    urgent.push({
      title: "Improve Job Search Strategy",
      reason: `You're looking for work. Let's optimize your resume, interview skills, and networking approach.`,
      category: "career",
      priority: "urgent",
      ageAppropriate: true,
      basedOnAnswer: "Job searching"
    });
  } else if (answers.work_situation?.value === 'new_job') {
    recommended.push({
      title: "Excel in Your New Role",
      reason: `You recently started a new job. Focus on building relationships and proving your value.`,
      category: "career",
      priority: "medium",
      ageAppropriate: true,
      basedOnAnswer: "New job"
    });
  }
  
  // Income situation analysis
  if (answers.income_status?.value === 'no_income') {
    if (age === '19-22' || age === '16-18') {
      recommended.push({
        title: "Find Part-Time Work or Internship",
        reason: `You have no regular income. For ${ageGroup.label}, even part-time work builds experience and savings.`,
        category: "career",
        priority: "medium",
        ageAppropriate: true,
        basedOnAnswer: "No income"
      });
    }
  } else if (answers.income_status?.value === 'part_time') {
    if (age === '23-26' || age === '27-30') {
      recommended.push({
        title: "Transition to Full-Time Employment",
        reason: `You have part-time work, but for ${ageGroup.label}, full-time employment provides better stability and benefits.`,
        category: "career",
        priority: "medium",
        ageAppropriate: true,
        basedOnAnswer: "Part-time work"
      });
    }
  }
  
  // Challenge-based recommendations
  if (answers.biggest_challenge?.value === 'money') {
    recommended.push({
      title: "Create a Money Management System",
      reason: `You identified money as your biggest challenge. Let's build a complete financial foundation.`,
      category: "money-finance",
      priority: "high",
      ageAppropriate: true,
      basedOnAnswer: "Money is biggest challenge"
    });
  } else if (answers.biggest_challenge?.value === 'independence') {
    recommended.push({
      title: "Build Independence Step by Step",
      reason: `You want to become more independent. Let's focus on life skills and self-sufficiency.`,
      category: "life-skills",
      priority: "high",
      ageAppropriate: true,
      basedOnAnswer: "Independence challenge"
    });
  } else if (answers.biggest_challenge?.value === 'career') {
    recommended.push({
      title: "Develop Career Direction Strategy",
      reason: `You're figuring out your career path. Let's explore options and build relevant skills.`,
      category: "career",
      priority: "high",
      ageAppropriate: true,
      basedOnAnswer: "Career challenge"
    });
  } else if (answers.biggest_challenge?.value === 'health') {
    recommended.push({
      title: "Build Health Management Skills",
      reason: `You identified health as a challenge. Let's establish healthcare routines and mental wellness.`,
      category: "health",
      priority: "high",
      ageAppropriate: true,
      basedOnAnswer: "Health challenge"
    });
  }
  
  // Life stage specific recommendations
  if (answers.life_stage?.value === 'college') {
    quickWins.push({
      title: "Maximize College Resources",
      reason: `You're in college. Take advantage of career services, internships, and networking opportunities.`,
      category: "career",
      priority: "low",
      ageAppropriate: true,
      basedOnAnswer: "College student"
    });
  } else if (answers.life_stage?.value === 'new_grad') {
    recommended.push({
      title: "Navigate Post-Graduation Transition",
      reason: `You're a recent graduate. Focus on job hunting, student loans, and building professional identity.`,
      category: "career",
      priority: "medium",
      ageAppropriate: true,
      basedOnAnswer: "Recent graduate"
    });
  }
  
  return {
    urgent: urgent.slice(0, 3),
    recommended: recommended.slice(0, 4),
    quickWins: quickWins.slice(0, 3)
  };
}

function analyzeMilestoneProgress(answers, ageGroup) {
  const completed = [];
  const missing = [];
  const inProgress = [];

  ageGroup.milestones.forEach(milestone => {
    const status = assessMilestoneStatus(answers, milestone);
    
    if (status === 'completed') {
      completed.push(milestone);
    } else if (status === 'in_progress') {
      inProgress.push(milestone);
    } else {
      missing.push(milestone);
    }
  });

  return {
    completed,
    missing,
    inProgress,
    completionRate: Math.round((completed.length / ageGroup.milestones.length) * 100)
  };
}

function assessMilestoneStatus(answers, milestone) {
  const category = milestone.category;
  
  switch (category) {
    case 'finance':
      if (milestone.task.includes('bank')) {
        return answers.banking?.value === 'no_account' ? 'missing' : 'completed';
      }
      if (milestone.task.includes('budget')) {
        return answers.budgeting?.value === 'no_tracking' ? 'missing' : 'completed';
      }
      if (milestone.task.includes('credit')) {
        return answers.banking?.value === 'advanced' ? 'completed' : 'missing';
      }
      if (milestone.task.includes('emergency fund')) {
        return answers.budgeting?.value === 'detailed' ? 'completed' : 'missing';
      }
      break;
    
    case 'health':
      if (milestone.task.includes('primary care')) {
        return answers.primary_care?.value === 'yes_regular' ? 'completed' : 'missing';
      }
      break;
    
    case 'living':
      if (milestone.task.includes('independent')) {
        return answers.living_situation?.value === 'solo_rent' || answers.living_situation?.value === 'own' ? 'completed' : 'missing';
      }
      break;
    
    case 'career':
      if (milestone.task.includes('job') || milestone.task.includes('employment')) {
        return answers.work_situation?.value === 'established' ? 'completed' : 'missing';
      }
      break;
    
    case 'life-skills':
      if (milestone.task.includes('cooking')) {
        return answers.cooking_skills?.value === 'cant_cook' ? 'missing' : 'completed';
      }
      break;
  }
  
  return 'missing';
}

function generateAgeBenchmark(answers, ageGroup) {
  const analysis = analyzeMilestoneProgress(answers, ageGroup);
  let status = 'on_track';
  let message = `You're doing well for your age group!`;
  
  if (analysis.completionRate < 30) {
    status = 'behind';
    message = `You're behind typical milestones for ${ageGroup.label}. Focus on the urgent tasks to catch up.`;
  } else if (analysis.completionRate < 60) {
    status = 'developing';
    message = `You're developing well but have room to grow compared to peers in ${ageGroup.label}.`;
  } else if (analysis.completionRate >= 80) {
    status = 'ahead';
    message = `You're ahead of most people your age! Consider preparing for the next life stage.`;
  }
  
  return { status, message, completionRate: analysis.completionRate };
}

function prioritizeUrgentTasks(answers, ageGroup, milestoneAnalysis) {
  const urgentMilestones = milestoneAnalysis.missing.filter(m => m.priority === 'high');
  
  return urgentMilestones.slice(0, 3).map(milestone => ({
    title: milestone.task,
    reason: `Critical milestone for ${ageGroup.label}`,
    category: milestone.category,
    priority: "urgent",
    ageAppropriate: true
  }));
}

function generateAgeAppropriateRecommendations(answers, ageGroup) {
  const mediumPriorityMilestones = ageGroup.milestones.filter(m => m.priority === 'medium');
  
  return mediumPriorityMilestones.slice(0, 4).map(milestone => ({
    title: milestone.task,
    reason: `Important step for ${ageGroup.label}`,
    category: milestone.category,
    priority: "medium",
    ageAppropriate: true
  }));
}

function generateQuickWins(answers, ageGroup) {
  const easyMilestones = ageGroup.milestones.filter(m => 
    m.category === 'life-skills' || 
    (m.priority === 'low' && assessMilestoneStatus(answers, m) === 'missing')
  );
  
  return easyMilestones.slice(0, 3).map(milestone => ({
    title: milestone.task,
    reason: `Easy win that builds confidence`,
    category: milestone.category,
    priority: "low",
    ageAppropriate: true
  }));
}

function generatePeerComparison(answers, ageGroup) {
  const analysis = analyzeMilestoneProgress(answers, ageGroup);
  
  const comparisons = [
    {
      area: "Financial Foundation",
      userStatus: assessFinancialStatus(answers),
      peerBenchmark: getFinancialBenchmarkForAge(ageGroup),
      recommendation: "Focus on banking and budgeting basics"
    },
    {
      area: "Independence Level", 
      userStatus: assessIndependenceStatus(answers),
      peerBenchmark: getIndependenceBenchmarkForAge(ageGroup),
      recommendation: "Work on living situation and life skills"
    },
    {
      area: "Career Development",
      userStatus: assessCareerStatus(answers),
      peerBenchmark: getCareerBenchmarkForAge(ageGroup),
      recommendation: "Build professional skills and network"
    }
  ];
  
  return comparisons;
}

function assessFinancialStatus(answers) {
  if (answers.banking?.value === 'no_account') return "Getting Started";
  if (answers.budgeting?.value === 'no_tracking') return "Basic";
  if (answers.budgeting?.value === 'detailed') return "Advanced";
  return "Developing";
}

function getFinancialBenchmarkForAge(ageGroup) {
  const ageKey = Object.keys(AGE_MILESTONES).find(key => AGE_MILESTONES[key] === ageGroup);
  
  switch (ageKey) {
    case "16-18": return "Most peers: Getting banking basics";
    case "19-22": return "Most peers: Learning budgeting";
    case "23-26": return "Most peers: Building emergency fund";
    case "27-30": return "Most peers: Saving for major goals";
    case "31-35": return "Most peers: Investing and planning";
    case "36+": return "Most peers: Wealth building";
    default: return "Most peers: Developing";
  }
}

function assessIndependenceStatus(answers) {
  if (answers.living_situation?.value === 'family') return "Getting Started";
  if (answers.living_situation?.value === 'dorms') return "Basic";
  if (answers.living_situation?.value === 'roommates') return "Developing";
  if (answers.living_situation?.value === 'solo_rent' || answers.living_situation?.value === 'own') return "Advanced";
  return "Developing";
}

function getIndependenceBenchmarkForAge(ageGroup) {
  const ageKey = Object.keys(AGE_MILESTONES).find(key => AGE_MILESTONES[key] === ageGroup);
  
  switch (ageKey) {
    case "16-18": return "Most peers: Living with family";
    case "19-22": return "Most peers: Shared housing";
    case "23-26": return "Most peers: Independent living";
    case "27-30": return "Most peers: Stable housing";
    case "31-35": return "Most peers: Considering homeownership";
    case "36+": return "Most peers: Established housing";
    default: return "Most peers: Developing";
  }
}

function assessCareerStatus(answers) {
  if (answers.work_situation?.value === 'student') return "Getting Started";
  if (answers.work_situation?.value === 'job_searching') return "Basic";
  if (answers.work_situation?.value === 'new_job') return "Developing";
  if (answers.work_situation?.value === 'established') return "Advanced";
  return "Developing";
}

function getCareerBenchmarkForAge(ageGroup) {
  const ageKey = Object.keys(AGE_MILESTONES).find(key => AGE_MILESTONES[key] === ageGroup);
  
  switch (ageKey) {
    case "16-18": return "Most peers: Part-time work";
    case "19-22": return "Most peers: Entry-level roles";
    case "23-26": return "Most peers: Building experience";
    case "27-30": return "Most peers: Career advancement";
    case "31-35": return "Most peers: Senior roles";
    case "36+": return "Most peers: Leadership/expertise";
    default: return "Most peers: Developing";
  }
}

// Fallback for users without age info
function generateBasicRecommendations(answers) {
  // Original recommendation logic as fallback
  const recommendations = [];
  const urgentTasks = [];
  const quickWins = [];

  if (answers.banking?.value === 'no_account' || answers.banking?.value === 'unsure') {
    urgentTasks.push({
      title: "Open Your First Bank Account",
      reason: "Essential foundation for financial independence",
      category: "money-finance",
      priority: "urgent"
    });
  }

  return {
    urgentTasks: urgentTasks.slice(0, 2),
    recommendations: recommendations.slice(0, 4),
    quickWins: quickWins.slice(0, 3),
    profile: analyzeUserProfile(answers)
  };
}

function analyzeUserProfile(answers) {
  return {
    lifeStage: answers.life_stage?.value || 'unknown',
    primaryChallenge: answers.biggest_challenge?.value,
    skillLevel: calculateOverallSkillLevel(answers),
    focusAreas: determineFocusAreas(answers)
  };
}

function calculateOverallSkillLevel(answers) {
  const skillAreas = [
    answers.cooking_skills?.value,
    answers.banking?.value,
    answers.budgeting?.value
  ];
  
  const skillMap = {
    'cant_cook': 1, 'no_account': 1, 'no_tracking': 1,
    'basic': 2, 'unsure': 2, 'mental': 2,
    'intermediate': 3, 'savings': 3, 'basic_app': 3,
    'advanced': 4, 'spreadsheet': 4,
    'expert': 5, 'detailed': 5
  };
  
  const scores = skillAreas.map(skill => skillMap[skill] || 3);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  if (average <= 2) return 'beginner';
  if (average <= 3.5) return 'developing';
  return 'competent';
}

function determineFocusAreas(answers) {
  const areas = [];
  
  if (answers.banking?.value === 'no_account' || answers.budgeting?.value === 'no_tracking') {
    areas.push('Financial Foundation');
  }
  
  if (answers.primary_care?.value !== 'yes_regular') {
    areas.push('Health Management');
  }
  
  if (answers.living_situation?.value === 'family' || answers.living_situation?.value === 'looking') {
    areas.push('Independent Living');
  }
  
  if (answers.work_situation?.value === 'job_searching' || answers.work_situation?.value === 'student') {
    areas.push('Career Development');
  }
  
  return areas.slice(0, 3);
}

// -----------------------------
// Authentication System
// -----------------------------
const AuthContext = createContext();

// Firebase authentication implementation
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = listenToAuth((fbUser) => {
      if (fbUser) {
        setUser({ uid: fbUser.uid, name: fbUser.displayName || fbUser.email?.split('@')[0], email: fbUser.email, emailVerified: fbUser.emailVerified });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { setIsLoading(false); }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { setIsLoading(false); }
  };

  const signup = async (name, email, password) => {
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await fbUpdateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);
    return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
    finally { setIsLoading(false); }
  };

  const logout = async () => { await signOut(auth); };
  const updateProfile = async (updates) => { if (auth.currentUser) { await fbUpdateProfile(auth.currentUser, updates); setUser((u)=>u?{...u,...updates}:u);} };
  const changePassword = async () => ({ success:false, error:'Use reset email' });
  const deleteAccount = async () => ({ success:false, error:'Not implemented' });

  return { user, isLoading, login, loginWithGoogle, signup, logout, updateProfile, changePassword, deleteAccount, isAuthenticated: !!user };
};

const AuthProvider = ({ children }) => {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// -----------------------------
// Theme toggle
// -----------------------------
function useThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });
  
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== 'undefined') {
    document.documentElement.classList.toggle("dark", next);
    }
  };
  
  return { isDark, toggle };
}

// -----------------------------
// Settings & Preferences
// -----------------------------
const useSettings = () => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('growup-settings');
    return saved ? JSON.parse(saved) : {
      theme: 'system', // 'light', 'dark', 'system'
      notifications: {
        email: true,
        achievements: true,
        reminders: true
      },
      privacy: {
        profileVisible: true,
        progressVisible: true
      },
      preferences: {
        language: 'en',
        timezone: 'auto'
      }
    };
  });

  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('growup-settings', JSON.stringify(updated));
  };

  return { settings, updateSettings };
};

// -----------------------------
// Settings Page
// -----------------------------
function SettingsPage() {
  const { user, updateProfile, changePassword, deleteAccount, isLoading } = useAuthContext();
  const { isDark, toggle } = useThemeToggle();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  
  // Profile editing state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileData.name || !profileData.email) {
      setProfileError('Please fill in all fields');
      return;
    }

    try {
      await updateProfile(profileData);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError('Failed to update profile. Please try again.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordError('Failed to change password. Please check your current password.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    try {
      await deleteAccount();
      navigate('/');
    } catch (err) {
      console.error('Failed to delete account');
    }
  };

  const exportData = () => {
    const data = {
      profile: user,
      progress: JSON.parse(localStorage.getItem('growup-progress') || '{}'),
      settings: settings,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growup-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
              <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-bold tracking-tight">Grow Up</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Toggle theme"
              onClick={toggle}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              icon={isDark ? Sun : Moon}
            >
              <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Back to Home
            </Button>
          </div>
        </Container>
      </header>

      {/* Settings Content */}
      <section className="py-16">
        <Container>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Account Settings</h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Manage your account, preferences, and privacy settings
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Settings */}
            <div className="lg:col-span-2 space-y-8">
              {/* Profile Settings */}
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 p-2 text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Profile Information</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Update your account details</p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {profileError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {profileSuccess}
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">Full name</label>
                    <input
                      id="name"
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">Email address</label>
                    <input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    icon={isLoading ? null : Save}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              </Card>

              {/* Password Change */}
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 p-2 text-white">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Change Password</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Update your password for better security</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordError && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {passwordSuccess}
                    </div>
                  )}

                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium mb-2">Current password</label>
                    <div className="relative">
                      <input
                        id="currentPassword"
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium mb-2">New password</label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">Confirm new password</label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      >
                        {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                    icon={isLoading ? null : Save}
                  >
                    {isLoading ? 'Changing...' : 'Change Password'}
                  </Button>
                </form>
              </Card>

              {/* Website Preferences */}
              <Card>
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 p-2 text-white">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Website Preferences</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Customize your experience</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Notification Settings */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(settings.notifications).map(([key, value]) => (
                        <label key={key} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => updateSettings({
                              notifications: { ...settings.notifications, [key]: e.target.checked }
                            })}
                            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Privacy
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(settings.privacy).map(([key, value]) => (
                        <label key={key} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => updateSettings({
                              privacy: { ...settings.privacy, [key]: e.target.checked }
                            })}
                            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Summary */}
              <Card>
                <h3 className="font-semibold mb-4">Account Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Member since</span>
                    <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">Account type</span>
                    <span>Free</span>
                  </div>
                </div>
              </Card>

              {/* Data Management */}
              <Card>
                <h3 className="font-semibold mb-4">Data Management</h3>
                <div className="space-y-3">
                  <Button
                    onClick={exportData}
                    className="w-full rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    icon={Download}
                  >
                    Export Data
                  </Button>
                </div>
              </Card>

              {/* Danger Zone */}
              <Card>
                <h3 className="font-semibold mb-4 text-red-600 dark:text-red-400">Danger Zone</h3>
                {!showDeleteConfirm ? (
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full rounded-xl bg-red-600 text-white hover:bg-red-700"
                    icon={Trash2}
                  >
                    Delete Account
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-red-50 p-3 dark:bg-red-900/30">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                        <div className="text-sm text-red-700 dark:text-red-300">
                          <p className="font-medium">This action cannot be undone.</p>
                          <p>This will permanently delete your account and all associated data.</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Type "DELETE" to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-red-500 dark:border-zinc-800 dark:bg-zinc-900"
                        placeholder="DELETE"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="flex-1 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || isLoading}
                        className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        icon={isLoading ? null : Trash2}
                      >
                        {isLoading ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

// -----------------------------
// Authentication Pages
// -----------------------------
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle, isLoading } = useAuthContext();
  const { isDark, toggle } = useThemeToggle();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      }
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
            <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-bold tracking-tight">Grow Up</span>
            </div>
          </Link>
          <Button
            aria-label="Toggle theme"
            onClick={toggle}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            icon={isDark ? Sun : Moon}
          >
            <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
          </Button>
        </Container>
      </header>

      {/* Login Form */}
      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-md">
            <Card>
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white mb-4">
                  <LogIn className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Sign in to your account to continue your adulting journey
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  icon={isLoading ? null : LogIn}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/reset" className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">Forgot password?</Link>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  onClick={async () => { setError(''); const r = await loginWithGoogle(); if (r.success) navigate('/'); else setError(r.error || 'Google sign-in failed'); }}
                  className="w-full rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Continue with Google
                </Button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Sign up
                  </Link>
                </p>
              </div>
            </Card>
          </div>
        </Container>
      </section>
    </div>
  );
}

function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { signup, isLoading } = useAuthContext();
  const { isDark, toggle } = useThemeToggle();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      const result = await signup(name, email, password);
      if (result.success) {
        navigate('/');
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
            <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-bold tracking-tight">Grow Up</span>
            </div>
          </Link>
          <Button
            aria-label="Toggle theme"
            onClick={toggle}
            className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            icon={isDark ? Sun : Moon}
          >
            <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
          </Button>
        </Container>
      </header>

      {/* Signup Form */}
      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-md">
            <Card>
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white mb-4">
                  <UserPlus className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Start your adulting journey today
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-10 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                      placeholder="At least 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  icon={isLoading ? null : UserPlus}
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                    Sign in
                  </Link>
                </p>
              </div>
            </Card>
          </div>
        </Container>
      </section>
    </div>
  );
}

function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { isDark, toggle } = useThemeToggle();

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (e) { setError(e.message || 'Failed to send reset email'); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
            <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-bold tracking-tight">Grow Up</span>
            </div>
          </Link>
          <Button aria-label="Toggle theme" onClick={toggle} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800" icon={isDark ? Sun : Moon}>
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </Button>
        </Container>
      </header>

      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-md">
            <Card>
              <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Enter your email, and we'll send a reset link.</p>
              {sent ? (
                <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Reset email sent to {email}. Check your inbox.</div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}
                  <div>
                    <label className="block text-sm font-medium mb-2">Email address</label>
                    <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900" />
                  </div>
                  <Button type="submit" className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Send reset link</Button>
                </form>
              )}
            </Card>
          </div>
        </Container>
      </section>
    </div>
  );
}

// -----------------------------
// Search Results Component
// -----------------------------
function SearchResults() {
  const { query } = useParams();
  const navigate = useNavigate();
  const { isDark, toggle } = useThemeToggle();
  const { progress, completeGuide, getLevel } = useGameProgress();
  const [newAchievements, setNewAchievements] = useState([]);
  
  const searchResults = searchGuides(query || '');
  const userLevel = getLevel();

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Beginner': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'Intermediate': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'Advanced': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const handleCompleteGuide = (guide) => {
    const achievements = completeGuide(guide.title, guide.categoryKey);
    if (achievements.length > 0) {
      setNewAchievements(achievements);
      setTimeout(() => setNewAchievements([]), 5000);
    }
  };

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'common': return 'from-gray-400 to-gray-500';
      case 'uncommon': return 'from-green-400 to-green-500';
      case 'rare': return 'from-blue-400 to-blue-500';
      case 'epic': return 'from-purple-400 to-purple-500';
      case 'legendary': return 'from-yellow-400 to-orange-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
              <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-bold tracking-tight">Grow Up</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Search Results</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Toggle theme"
              onClick={toggle}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              icon={isDark ? Sun : Moon}
            >
              <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Back to Home
            </Button>
          </div>
        </Container>
      </header>

      {/* Search Results */}
      <section className="py-16">
        <Container>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Search Results for "{query}"
            </h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Found {searchResults.length} guide{searchResults.length !== 1 ? 's' : ''} matching your search
            </p>
          </div>

          {searchResults.length === 0 ? (
            <Card className="text-center py-12">
              <Search className="mx-auto h-12 w-12 text-zinc-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No guides found</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Try searching for different keywords or browse our categories
              </p>
              <Button
                onClick={() => navigate('/')}
                className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                icon={ChevronRight}
              >
                Browse Categories
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {searchResults.map((guide, idx) => (
                <motion.div 
                  key={`${guide.categoryKey}-${idx}`}
                  initial={{ opacity: 0, y: 8 }} 
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="rounded-xl bg-zinc-100 p-3 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {React.createElement(guide.icon, { className: "h-6 w-6" })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold leading-tight">{guide.title}</h3>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getDifficultyColor(guide.difficulty)}`}>
                            {guide.difficulty}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{guide.summary}</p>
                        
                        <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <div className={`w-3 h-3 rounded bg-gradient-to-r ${guide.categoryColor}`}></div>
                            <span>{guide.categoryName}</span>
                          </div>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{guide.timeToRead}</span>
                          </div>
                          <span>•</span>
                          <span>{guide.steps.length} steps</span>
                        </div>

                        <div className="mt-4">
                          <details className="group">
                            <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                              <span>Quick preview</span>
                              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="mt-3 space-y-2">
                              {guide.steps.map((step, stepIdx) => (
                                <div key={stepIdx} className="flex items-start gap-2 text-sm">
                                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                    {stepIdx + 1}
                                  </span>
                                  <span className="text-zinc-600 dark:text-zinc-400">{step}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>

                        <div className="mt-4 space-y-2">
                          <Button 
                            className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" 
                            icon={BookOpen}
                            onClick={() => navigate(`/category/${guide.categoryKey}`)}
                          >
                            View in {guide.categoryName}
                          </Button>
                          {(() => {
                            const guideProgress = getGuideProgress ? getGuideProgress(guide) : { percentage: 0, completed: 0, total: guide.tasks?.length || 0 };
                            const isComplete = guideProgress.percentage === 100;
                            
                            if (isComplete) {
                              return (
                            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                                  <span>Completed Automatically! 🎉</span>
                            </div>
                              );
                            } else {
                              return (
                                <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                  Complete all {guideProgress.total - guideProgress.completed} remaining tasks to finish this guide
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* Achievement Notifications */}
      {newAchievements.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {newAchievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg bg-gradient-to-br ${getRarityColor(achievement.rarity)} p-2 text-white`}>
                  {React.createElement(achievement.icon, { className: "h-5 w-5" })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{achievement.title}</h4>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">+{achievement.points} XP</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{achievement.description}</p>
                  <div className="mt-2 text-xs text-zinc-500 capitalize">{achievement.rarity} Achievement</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------
// Category Page Component  
// -----------------------------
function CategoryPage() {
  const { categoryKey } = useParams();
  const navigate = useNavigate();
  const { isDark, toggle } = useThemeToggle();
  const { progress, completeGuide, getCategoryProgress, getLevel, toggleTask, getGuideProgress, isTaskCompleted } = useGameProgress();
  const { user, logout, isAuthenticated } = useAuthContext();
  const [newAchievements, setNewAchievements] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [notification, setNotification] = useState(null);
  
  console.log('CategoryPage rendered with categoryKey:', categoryKey);
  
  // Show notification function
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const category = CATEGORIES.find(c => c.key === categoryKey);
  const guides = DETAILED_GUIDES[categoryKey] || [];
  const categoryProgress = getCategoryProgress(categoryKey);
  const userLevel = getLevel();
  
  console.log('Found category:', category);
  console.log('Found guides:', guides.length);
  
  if (!category) {
    return <div>Category not found: {categoryKey}</div>;
  }

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Beginner': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'Intermediate': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      case 'Advanced': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const handleCompleteGuide = (guide) => {
    const achievements = completeGuide(guide.title, categoryKey);
    showNotification(`🎉 Guide completed: "${guide.title}"! +${guide.difficulty === 'Beginner' ? 50 : guide.difficulty === 'Intermediate' ? 75 : 100} XP`, 'success');
    
    if (achievements.length > 0) {
      setNewAchievements(achievements);
      setTimeout(() => setNewAchievements([]), 5000);
      
      achievements.forEach((achievement, index) => {
        setTimeout(() => {
          showNotification(`🏆 Achievement unlocked: "${achievement.title}"! +${achievement.points} XP`, 'success');
        }, 1000 + (index * 1000));
      });
    }
  };

  const getRarityColor = (rarity) => {
    switch(rarity) {
      case 'common': return 'from-gray-400 to-gray-500';
      case 'uncommon': return 'from-green-400 to-green-500';
      case 'rare': return 'from-blue-400 to-blue-500';
      case 'epic': return 'from-purple-400 to-purple-500';
      case 'legendary': return 'from-yellow-400 to-orange-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className={`rounded-lg px-4 py-3 text-white shadow-lg ${
            notification.type === 'success' ? 'bg-emerald-500' : 
            notification.type === 'info' ? 'bg-blue-500' : 'bg-red-500'
          }`}>
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
              <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-bold tracking-tight">Grow Up</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{category.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Toggle theme"
              onClick={toggle}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              icon={isDark ? Sun : Moon}
            >
              <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </Button>
            
            {isAuthenticated && (
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <Link to="/profile" className="group">
                  <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                    <User className="h-4 w-4 text-zinc-500 group-hover:text-blue-600" />
                    <span className="font-medium group-hover:text-blue-600">{user.name}</span>
                    <span className="text-xs text-zinc-400 group-hover:text-blue-500">View Profile</span>
                  </div>
                </Link>
              </div>
            )}
            
            <Button
              onClick={() => navigate('/')}
              className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Back to Home
            </Button>
          </div>
        </Container>
      </header>

      {/* Category Hero */}
      <section className="py-16 border-b border-zinc-100/60 dark:border-zinc-900/60">
        <Container>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex items-start gap-6">
                <div className={`rounded-2xl bg-gradient-to-br ${category.color} p-4 text-white shadow-lg`}>
                  {React.createElement(category.icon, { className: "h-8 w-8" })}
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{category.name}</h1>
                  <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">{category.desc}</p>
                  <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                    <span>{guides.length} guides available</span>
                    <span>•</span>
                    <span>Beginner to Advanced</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Category Progress</span>
                      <span className="text-sm text-zinc-500">{categoryProgress.completed}/{categoryProgress.total} completed</span>
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-3 dark:bg-zinc-800">
                      <div 
                        className={`h-3 rounded-full bg-gradient-to-r ${category.color} transition-all duration-500`}
                        style={{ width: `${categoryProgress.percentage}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {categoryProgress.percentage}% complete
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Gamification Stats */}
            <div className="space-y-4">
              <Card>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 p-2 text-white">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Level</div>
                    <div className="text-xl font-bold">{userLevel.level}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">XP Progress</span>
                    <span className="text-xs text-zinc-500">{userLevel.pointsToNext} to next level</span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2 dark:bg-zinc-800">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
                      style={{ width: `${userLevel.progress}%` }}
                    ></div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 text-white">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Points</div>
                    <div className="text-xl font-bold">{progress.totalPoints.toLocaleString()}</div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 p-2 text-white">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">Learning Streak</div>
                    <div className="text-xl font-bold">{progress.currentStreak} days</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Guides Grid */}
      <section className="py-14">
        <Container>
          <div className="grid gap-6 md:grid-cols-2">
            {guides.map((guide, idx) => (
              <motion.div 
                key={`guide-${guide.categoryKey}-${idx}`} 
                initial={{ opacity: 0, y: 8 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-zinc-100 p-3 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {React.createElement(guide.icon || Wallet, { className: "h-6 w-6" })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold leading-tight">{guide.title}</h3>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getDifficultyColor(guide.difficulty)}`}>
                          {guide.difficulty}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{guide.summary}</p>
                      
                      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{guide.duration || guide.timeToRead}</span>
                        </div>
                        <span>•</span>
                        <span>{(guide.steps || []).length} steps</span>
                        {guide.tasks && (
                          <>
                            <span>•</span>
                            <span>{(guide.tasks || []).length} tasks</span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {guide.tasks && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Progress</span>
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              {getGuideProgress(guide).percentage}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-200 rounded-full dark:bg-zinc-700">
                            <div 
                              className="h-1.5 bg-indigo-600 rounded-full transition-all duration-300" 
                              style={{ width: `${getGuideProgress(guide).percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            {getGuideProgress(guide).completed} of {getGuideProgress(guide).total} tasks completed
                          </p>
                        </div>
                      )}

                      <div className="mt-4">
                        <details className="group">
                          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                            <span>Quick preview</span>
                            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                          </summary>
                          <div className="mt-3 space-y-2">
                            {(guide.steps || []).map((step, stepIdx) => (
                              <div key={stepIdx} className="flex items-start gap-2 text-sm">
                                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                  {stepIdx + 1}
                                </span>
                                <span className="text-zinc-600 dark:text-zinc-400">{step}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Button 
                          className="w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" 
                          icon={BookOpen}
                          onClick={() => setSelectedGuide(guide)}
                        >
                          Read Full Guide
                        </Button>
                        {(() => {
                          const guideProgress = getGuideProgress(guide);
                          const isComplete = guideProgress.percentage === 100;
                          
                          if (isComplete) {
                            return (
                          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                                <span>Completed Automatically! 🎉</span>
                          </div>
                            );
                          } else {
                            return (
                              <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                                Complete all {guideProgress.total - guideProgress.completed} remaining tasks to finish this guide
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Achievement Notifications */}
      {newAchievements.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {newAchievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg bg-gradient-to-br ${getRarityColor(achievement.rarity)} p-2 text-white`}>
                  {React.createElement(achievement.icon, { className: "h-5 w-5" })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{achievement.title}</h4>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">+{achievement.points} XP</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{achievement.description}</p>
                  <div className="mt-2 text-xs text-zinc-500 capitalize">{achievement.rarity} Achievement</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full Guide Modal */}
      {selectedGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`inline-flex rounded-xl bg-gradient-to-br ${category.color} p-2 text-white shadow`}>
                    {React.createElement(category.icon, { className: "h-5 w-5" })}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedGuide.title}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getDifficultyColor(selectedGuide.difficulty)}`}>
                        {selectedGuide.difficulty}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <Clock className="h-4 w-4" />
                        <span>{selectedGuide.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">{selectedGuide.description}</p>
              </div>
              <Button
                onClick={() => setSelectedGuide(null)}
                className="ml-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                icon={X}
              >
                Close
              </Button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Progress Section */}
                {selectedGuide.tasks && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-indigo-800 dark:text-indigo-200">Your Progress</h4>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {getGuideProgress(selectedGuide).percentage}% Complete
                      </span>
                    </div>
                    <div className="mb-4">
                      <div className="h-2 bg-indigo-200 rounded-full dark:bg-indigo-800">
                        <div 
                          className="h-2 bg-indigo-600 rounded-full transition-all duration-300" 
                          style={{ width: `${getGuideProgress(selectedGuide).percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        {getGuideProgress(selectedGuide).completed} of {getGuideProgress(selectedGuide).total} tasks completed
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Tasks */}
                {selectedGuide.tasks && (
                  <div>
                    <h4 className="mb-4 text-lg font-semibold">Action Tasks</h4>
                    <div className="space-y-3">
                      {selectedGuide.tasks.map((task, index) => (
                        <div key={task.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isTaskCompleted(task.id)}
                              onChange={() => {
                                const wasCompleted = isTaskCompleted(task.id);
                                const result = toggleTask(task.id, selectedGuide.title);
                                
                                if (!wasCompleted) {
                                  showNotification('🎉 Task completed! +10 XP earned', 'success');
                                  
                                  // Check if any guides were auto-completed
                                  if (result.autoCompletedGuides && result.autoCompletedGuides.length > 0) {
                                    result.autoCompletedGuides.forEach((completion, index) => {
                                      setTimeout(() => {
                                        showNotification(`🎉 Guide completed: "${completion.guide.title}"! +${completion.pointsEarned} XP`, 'success');
                                      }, 1000 + (index * 1000));
                                    });
                                  }
                                } else {
                                  showNotification('Task unchecked', 'info');
                                }
                              }}
                              className="mt-1 h-5 w-5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <p className={`text-zinc-700 dark:text-zinc-300 font-medium ${isTaskCompleted(task.id) ? 'line-through opacity-60' : ''}`}>
                                  {task.text}
                                </p>
                                
                                {/* Task Metadata */}
                                <div className="flex items-center gap-2 ml-4">
                                  {task.difficulty && (
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      task.difficulty === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      task.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                      {task.difficulty}
                                    </div>
                                  )}
                                  {task.timeEstimate && (
                                    <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                      <Timer className="h-3 w-3" />
                                      {task.timeEstimate}
                                    </div>
                                  )}
                                  {task.cost && (
                                    <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                      <DollarSign className="h-3 w-3" />
                                      {task.cost}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {isTaskCompleted(task.id) && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                  +10 XP earned
                                </span>
                              )}
                              
                              {/* Enhanced Micro-actions */}
                              {task.microActions && (
                                <div className="mt-4">
                                  <details className="group">
                                    <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                                      <span>Show step-by-step instructions</span>
                                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                    </summary>
                                    <div className="mt-4 space-y-3">
                                      {task.microActions.map((action, actionIdx) => {
                                        // Handle both old string format and new object format
                                        const actionText = typeof action === 'string' ? action : action.text;
                                        const actionTime = typeof action === 'object' ? action.time : null;
                                        const actionResources = typeof action === 'object' ? action.resources : [];
                                        
                                        return (
                                          <div key={actionIdx} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                                            <div className="flex items-start gap-3">
                                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                                                {actionIdx + 1}
                                              </span>
                                              <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                  <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                                                    {actionText}
                                                  </p>
                                                  {actionTime && (
                                                    <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                                                      <Clock className="h-3 w-3" />
                                                      {actionTime}
                                                    </div>
                                                  )}
                                                </div>
                                                
                                                {/* Clickable Resources */}
                                                {actionResources && actionResources.length > 0 && (
                                                  <div className="mt-2 flex flex-wrap gap-2">
                                                    {actionResources.map((resource, resourceIdx) => (
                                                      <a
                                                        key={resourceIdx}
                                                        href={resource}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                                                      >
                                                        <ExternalLink className="h-3 w-3" />
                                                        {new URL(resource).hostname.replace('www.', '')}
                                                      </a>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}



                {/* Tips */}
                {selectedGuide.tips && selectedGuide.tips.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/30">
                    <h4 className="mb-3 font-semibold text-emerald-800 dark:text-emerald-200">💡 Pro Tips</h4>
                    <ul className="space-y-2 text-sm text-emerald-700 dark:text-emerald-300">
                      {selectedGuide.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span>•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Guide Completion Status */}
                <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
                  {(() => {
                    const guideProgress = getGuideProgress(selectedGuide);
                    const isComplete = guideProgress.percentage === 100;
                    
                    if (isComplete) {
                      return (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                          <span className="font-semibold">Guide Completed! 🎉</span>
                    </div>
                      );
                    } else {
                      return (
                        <div className="text-center">
                          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                            Complete all tasks to finish this guide
                          </div>
                          <div className="w-full bg-zinc-200 rounded-full h-2 dark:bg-zinc-700">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${guideProgress.percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                            {guideProgress.completed}/{guideProgress.total} tasks completed
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// -----------------------------
// Landing Page (for non-authenticated users)
// -----------------------------
function LandingPage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useThemeToggle();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
            <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-bold tracking-tight">Grow Up</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              aria-label="Toggle theme"
              onClick={toggle}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              icon={isDark ? Sun : Moon}
            >
              <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </Button>
            
            <Button
              onClick={() => navigate('/login')}
              className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Sign In
            </Button>
            
            <Button
              onClick={() => navigate('/signup')}
              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Get Started
            </Button>
          </div>
        </Container>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-28">
        <div className="hidden sm:block pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gradient-to-br from-indigo-400/20 to-cyan-300/20 blur-3xl" />
        <div className="hidden sm:block pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-rose-300/20 blur-3xl" />
        
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <Badge className="mb-6">The #1 adulting platform for young people</Badge>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-7xl">
                Master adulting
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
                  one step at a time
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400 sm:text-xl">
                From setting up your first bank account to navigating healthcare, we turn overwhelming adult tasks into simple, achievable wins.
              </p>
              
              <div className="mt-8 sm:mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={() => navigate('/signup')}
                  className="rounded-2xl bg-indigo-600 px-5 py-3 text-base sm:px-8 sm:py-4 sm:text-lg font-semibold text-white hover:bg-indigo-700"
                  icon={Rocket}
                >
                  Start Your Journey
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-base sm:px-8 sm:py-4 sm:text-lg font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  icon={LogIn}
                >
                  Sign In
                </Button>
              </div>

              {/* Trust metrics */}
              <div className="mt-10 grid grid-cols-1 gap-3 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    100+ actionable guides
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    10K+ tasks completed
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    Privacy-first, no data sold
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to become independent</h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Bite‑size lessons, checklists, and tools that turn adulting from overwhelming to manageable.</p>
          </div>

          <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"><BookOpen className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold">Structured roadmaps</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Clear step‑by‑step paths for money, health, housing, career, and life skills.</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"><Award className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold">Gamified progress</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Earn XP, unlock achievements, and keep a streak while you learn.</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-sky-50 p-2 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300"><BarChart3 className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold">Peer benchmarks</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">See how your finances compare to people your age and build a plan.</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"><Zap className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold">Actionable checklists</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Every guide comes with tasks you can actually do and track.</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"><HeartHandshake className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold">Supportive community</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Get encouragement and see what others your age are tackling next.</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-zinc-50 p-2 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200"><Lock className="h-5 w-5" /></div>
                <div>
                  <h3 className="font-semibold">Privacy first</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Your data stays yours. We never sell personal information.</p>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* Categories Preview */}
      <section className="py-12 sm:py-16 bg-zinc-50/50 dark:bg-zinc-950/50">
        <Container>
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Master the 5 essential areas of adulting
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Our comprehensive curriculum covers everything you need to thrive as an independent adult.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat, index) => (
              <motion.div
                key={cat.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.07 }}
              >
                <Card className="h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`inline-flex rounded-xl bg-gradient-to-br ${cat.color} p-3 text-white shadow`}>
                      {React.createElement(cat.icon, { className: "h-6 w-6" })}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{cat.name}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{cat.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Loved by learners</h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">Real stories from young people leveling up their life skills.</p>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">A</div>
                <div>
                  <div className="font-semibold">Alex, 19</div>
                  <div className="flex text-amber-500"><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /></div>
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">“I opened my first credit card and built a budget in one weekend. The step‑by‑step tasks made it easy.”</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">M</div>
                <div>
                  <div className="font-semibold">Maya, 22</div>
                  <div className="flex text-amber-500"><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /></div>
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">“The benchmarks showed me where I stood with savings. Now I’m depositing automatically every paycheck.”</p>
            </Card>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-white">J</div>
                <div>
                  <div className="font-semibold">Jordan, 24</div>
                  <div className="flex text-amber-500"><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /><Star className="h-4 w-4" /></div>
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">“I finally feel confident handling renters insurance and basic healthcare stuff. Wish I had this sooner.”</p>
            </Card>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-2xl text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          </div>

          <FAQ />
        </Container>
      </section>

      {/* Final CTA */}
      <section className="py-14 sm:py-20 bg-gradient-to-r from-indigo-600 to-sky-500">
        <Container>
          <div className="mx-auto max-w-2xl text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to master adulting?
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              Join thousands of young people who've transformed from overwhelmed to confident adults.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                onClick={() => navigate('/signup')}
                className="rounded-2xl bg-white px-5 py-3 text-base sm:px-8 sm:py-4 sm:text-lg font-semibold text-indigo-600 hover:bg-gray-50"
                icon={Rocket}
              >
                Start Free Today
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50">
        <Container>
          <div className="py-12 md:flex md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-bold tracking-tight">Grow Up</span>
            </div>
            <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 md:mt-0">
              © {new Date().getFullYear()} Grow Up. All rights reserved.
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}

// Simple FAQ accordion used on the LandingPage
function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);
  const faqs = [
    {
      q: "What is Grow Up?",
      a: "Grow Up is a guided learning platform that turns essential adult skills into step‑by‑step roadmaps with checklists, progress tracking, and positive reinforcement.",
    },
    {
      q: "Is Grow Up free?",
      a: "You can start for free and access a large set of guides. We’ll offer optional premium content and tools later — your data remains private either way.",
    },
    {
      q: "How does progress tracking work?",
      a: "Each guide breaks into small tasks. When you complete all tasks in a guide, it’s marked complete automatically and you earn XP toward achievements.",
    },
    {
      q: "Do you sell my data?",
      a: "No. We practice a privacy‑first approach. Your personal data is never sold.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="space-y-3">
        {faqs.map((item, idx) => (
          <Card key={idx} className="cursor-pointer" onClick={() => setOpenIndex(openIndex === idx ? null : idx)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{item.q}</div>
                {openIndex === idx && (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{item.a}</p>
                )}
              </div>
              <ChevronRight className={`h-5 w-5 shrink-0 transition-transform ${openIndex === idx ? 'rotate-90 text-indigo-600' : 'text-zinc-400'}`} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// -----------------------------
// Main Home Page (authenticated users only)
// -----------------------------
function HomePage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const { isDark, toggle } = useThemeToggle();
  const navigate = useNavigate();
  const { getCategoryProgress, getLevel, progress } = useGameProgress();
  const { user, logout, isAuthenticated } = useAuthContext();
  const { activePlan, generatePlan } = usePlansContext();

  const searchSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    return searchGuides(query).slice(0, 5); // Show top 5 suggestions
  }, [query]);

  const filteredGuides = useMemo(() => {
    const q = query.toLowerCase().trim();
    return FEATURED_GUIDES.filter((g) => {
      const inFilter = activeFilter === "all" || g.category === activeFilter;
      const inQuery = !q || g.title.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q);
      return inFilter && inQuery;
    });
  }, [query, activeFilter]);

  const categoryTabs = ["all", ...new Set(FEATURED_GUIDES.map((g) => g.category))];

  const quizResults = useMemo(() => {
    console.log('Quiz results memoization triggered. Answers:', answers);
    console.log('Answers length:', Object.keys(answers).length);
    if (Object.keys(answers).length === 0) return null;
    const results = generatePersonalizedRecommendations(answers);
    console.log('Generated quiz results:', results);
    return results;
  }, [answers]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
              <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-bold tracking-tight">Grow Up</span>
              </div>
            </div>
            <nav className="hidden md:flex md:items-center md:gap-6 ml-6 text-sm text-zinc-600 dark:text-zinc-400">
              <a href="#essentials" className="hover:text-zinc-900 dark:hover:text-zinc-100">Essentials</a>
              <a href="#quiz" className="hover:text-zinc-900 dark:hover:text-zinc-100">Start Quiz</a>
              <a href="#guides" className="hover:text-zinc-900 dark:hover:text-zinc-100">Guides</a>
              <a href="#newsletter" className="hover:text-zinc-900 dark:hover:text-zinc-100">Tips</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (query.trim()) {
                    setShowSearchDropdown(false);
                    navigate(`/search/${encodeURIComponent(query.trim())}`);
                  }
                }}
              >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSearchDropdown(e.target.value.trim().length > 0);
                  }}
                  onFocus={() => setShowSearchDropdown(query.trim().length > 0)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                placeholder="Search guides…"
                className="h-10 w-56 rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
              />
              </form>
              
              {/* Search Dropdown */}
              {showSearchDropdown && searchSuggestions.length > 0 && (
                <div className="absolute top-full mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900 z-50">
                  <div className="p-2">
                    <div className="text-xs font-medium text-zinc-500 mb-2 px-2">Quick results</div>
                    {searchSuggestions.map((guide, idx) => (
                      <button
                        key={`${guide.categoryKey}-${idx}`}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          navigate(`/search/${encodeURIComponent(query.trim())}`);
                        }}
                        className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left"
                      >
                        <div className="rounded-lg bg-zinc-100 p-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {React.createElement(guide.icon, { className: "h-4 w-4" })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{guide.title}</div>
                          <div className="text-xs text-zinc-500">{guide.categoryName}</div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setShowSearchDropdown(false);
                        navigate(`/search/${encodeURIComponent(query.trim())}`);
                      }}
                      className="w-full flex items-center gap-2 p-2 mt-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <Search className="h-4 w-4" />
                      <span>View all results for "{query}"</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <Button
              aria-label="Toggle theme"
              onClick={toggle}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              icon={isDark ? Sun : Moon}
            >
              <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </Button>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {/* Mobile Profile Button */}
                <Link to="/profile" className="sm:hidden">
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200">
                    <User className="h-4 w-4 text-white" />
                    {progress?.currentStreak > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <Flame className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Desktop Profile Link */}
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <Link to="/profile" className="group">
                    <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-200 cursor-pointer">
                      <User className="h-4 w-4 text-zinc-500 group-hover:text-indigo-600 transition-colors" />
                      <div className="flex flex-col">
                      <span className="font-medium group-hover:text-indigo-600 transition-colors">{user.name}</span>
                        {progress && (
                          <div className="flex items-center gap-1">
                            <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-300"
                                style={{ width: `${Math.round(((progress.completedTasks?.length || 0) / Math.max(Object.values(DETAILED_GUIDES).flat().reduce((total, guide) => total + (guide.tasks?.length || 0), 0), 1)) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{progress.totalPoints || 0} XP</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
                <Button
                  onClick={() => navigate('/settings')}
                  className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  icon={Settings}
                >
                  <span className="hidden sm:inline">Settings</span>
                </Button>
                <Button
                  onClick={logout}
                  className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  icon={LogOut}
                >
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate('/login')}
                  className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  icon={LogIn}
                >
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  icon={UserPlus}
                >
                  <span className="hidden sm:inline">Sign up</span>
                </Button>
              </div>
            )}
          </div>
        </Container>
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden py-14 sm:py-20 md:py-28">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-sky-50/30 dark:from-indigo-900/10 dark:to-sky-900/10"></div>
        <div className="hidden sm:block absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-200/20 to-sky-200/20 dark:from-indigo-800/10 dark:to-sky-800/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="hidden sm:block absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-200/20 to-teal-200/20 dark:from-emerald-800/10 dark:to-teal-800/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="hidden sm:block absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-purple-200/10 to-pink-200/10 dark:from-purple-800/5 dark:to-pink-800/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        
        <Container className="relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Column - Content */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.35 }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Dynamic Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
              {isAuthenticated ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50 backdrop-blur-sm">
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      👋
                    </motion.div>
                    Welcome back, {user?.name}!
                    {progress?.currentStreak > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="ml-2 flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 text-xs font-bold"
                      >
                        <Flame className="h-3 w-3" />
                        {progress.currentStreak} day streak!
                      </motion.div>
                    )}
                  </div>
              ) : (
              <Badge>Become confident at adulting</Badge>
              )}
              </motion.div>

              {/* Dynamic Title */}
              <div className="space-y-4">
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 }}
                  className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight lg:text-6xl"
                >
                {isAuthenticated ? (
                    <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 dark:from-indigo-400 dark:via-purple-400 dark:to-sky-400 bg-clip-text text-transparent">
                      Continue your adulting journey
                    </span>
                  ) : (
                    <>Everything you need to know about <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">becoming an adult</span> — in one place.</>
                  )}
                </motion.h1>
                
                {/* Progress Summary for Authenticated Users */}
                {isAuthenticated && progress && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm"
                  >
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center">
                        <Target className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold">
                        {Math.round((progress.completedTasks?.length || 0) / (progress.totalTasks || 1) * 100)}% Complete
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold">{progress.totalPoints || 0} XP</span>
                    </div>
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold">{progress.unlockedAchievements?.length || 0} Achievements</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.25 }}
                className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl"
              >
                {isAuthenticated ? (
                  <>Ready to level up? Pick up where you left off or explore new skills. Your personalized learning path awaits!</>
                ) : (
                  <>From setting up your first doctor's appointment to budgeting for groceries, Grow Up turns daunting tasks into simple, step‑by‑step wins.</>
                )}
              </motion.p>

              {/* Enhanced Action Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.1 }}
                className="flex flex-wrap gap-3 sm:gap-4 justify-center"
              >
                <Button 
                  className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
                  onClick={() => document.getElementById("essentials")?.scrollIntoView({ behavior: "smooth" })} 
                  icon={ChevronRight}
                >
                  {isAuthenticated ? "Continue Learning" : "Start Learning"}
                </Button>
                
                {isAuthenticated ? (
                  <Button 
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 shadow-lg transition-all duration-300" 
                    onClick={() => {
                      // Navigate to first incomplete task
                      document.getElementById("essentials")?.scrollIntoView({ behavior: "smooth" });
                    }} 
                    icon={Rocket}
                  >
                    Quick 5-min Task
                  </Button>
                ) : (
                  <Button 
                    className="rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 shadow-lg transition-all duration-300" 
                    onClick={() => { setShowQuiz(true); document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" }); }} 
                    icon={CheckCircle2}
                  >
                  Take the Quiz
                </Button>
                )}
              </motion.div>

              {/* Features */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.35 }}
                className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                    <ShieldCheck className="h-3 w-3 text-white" />
              </div>
                  <span>Plain‑English guides</span>
              </div>
                <span>•</span>
                <span>No fluff</span>
                <span>•</span>
                <span>Action‑first checklists</span>
            </motion.div>
            </motion.div>

            {/* Right Column - Interactive Category Preview */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ duration: 0.35, delay: 0.15 }}
              className="relative"
            >
              <div className="relative">
                {/* Free Badge */}
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
                  className="absolute -right-3 -top-3 z-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white shadow-lg"
                >
                  Free
                </motion.div>

                {/* Enhanced Category Grid */}
                <Card className="border-0 bg-gradient-to-br from-white/90 via-white/50 to-white/90 dark:from-zinc-900/90 dark:via-zinc-800/50 dark:to-zinc-900/90 backdrop-blur-sm shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                    {CATEGORIES.map((category, index) => {
                      const categoryProgress = getCategoryProgress(category.key);
                      return (
                        <motion.div
                          key={category.key}
                          initial={{ opacity: 0, y: 20, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25, delay: 0.25 + index * 0.07 }}
                        >
                          <div 
                            className="group relative rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 p-4 cursor-pointer transition-all duration-300 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-lg hover:scale-105"
                      onClick={() => {
                              console.log('Hero category clicked:', category.key);
                              navigate(`/category/${category.key}`);
                            }}
                          >
                            {/* Progress Ring Around Icon */}
                            <div className="relative mb-3 w-12 h-12 sm:w-14 sm:h-14">
                              <div className={`absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br ${category.color} text-white shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                                {React.createElement(category.icon, { className: "h-5 w-5 sm:h-6 sm:w-6" })}
                    </div>
                              {/* Progress Ring */}
                              {isAuthenticated && categoryProgress.total > 0 && (
                                <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                                  <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-zinc-200 dark:text-zinc-700" />
                                  <motion.circle 
                                    cx="24" 
                                    cy="24" 
                                    r="22" 
                                    stroke="url(#progress-gradient)" 
                                    strokeWidth="2" 
                                    fill="transparent"
                                    strokeDasharray={`${2 * Math.PI * 22}`}
                                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - categoryProgress.percentage / 100)}`}
                                    strokeLinecap="round"
                                    initial={{ strokeDashoffset: `${2 * Math.PI * 22}` }}
                                    animate={{ strokeDashoffset: `${2 * Math.PI * 22 * (1 - categoryProgress.percentage / 100)}` }}
                                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.4 + index * 0.08 }}
                                  />
                                  <defs>
                                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#10b981" />
                                      <stop offset="100%" stopColor="#059669" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                              )}

                              {/* Progress Badge */}
                              {isAuthenticated && categoryProgress.completed > 0 && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: 1 + index * 0.1, type: "spring", stiffness: 300 }}
                                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                                >
                                  {categoryProgress.percentage}%
                                </motion.div>
                              )}
                </div>

                            <div className="space-y-2">
                              <div className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {category.name}
                </div>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                {category.desc}
                              </p>
                              
                              {/* Task Count for Authenticated Users */}
                              {isAuthenticated && categoryProgress.total > 0 && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-zinc-500 dark:text-zinc-400">
                                    {categoryProgress.completed}/{categoryProgress.total} tasks
                                  </span>
                                  {categoryProgress.completed > 0 && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 1.2 + index * 0.1 }}
                                      className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      <span className="font-medium">In Progress</span>
                                    </motion.div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Hover Arrow */}
                            <motion.div
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              whileHover={{ x: 2 }}
                            >
                              <ChevronRight className="h-4 w-4 text-zinc-400" />
                            </motion.div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  
                  {/* Bottom Message */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                    className="mt-6 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>
                      {isAuthenticated ? 
                        "Your personalized learning journey with real progress tracking." : 
                        "Save guides to your plan and track progress."
                      }
                    </span>
                  </motion.div>
              </Card>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Enhanced Essentials Section */}
      <section id="essentials" className="py-14 sm:py-20 relative">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-zinc-50/30 dark:from-slate-900/10 dark:to-zinc-900/10"></div>
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-blue-200/10 to-indigo-200/10 dark:from-blue-800/5 dark:to-indigo-800/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-br from-emerald-200/10 to-teal-200/10 dark:from-emerald-800/5 dark:to-teal-800/5 rounded-full blur-3xl"></div>
        
        <Container className="relative z-10">
          {/* Enhanced Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10 sm:mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-4"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-sky-100 dark:from-indigo-900/30 dark:to-sky-900/30 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 backdrop-blur-sm">
                <Star className="h-4 w-4" />
                The Essentials
              </span>
            </motion.div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl mb-3 sm:mb-4">
              <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 dark:from-slate-100 dark:via-indigo-100 dark:to-slate-100 bg-clip-text text-transparent">
                Master the basics first
              </span>
            </h2>
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto">
              {isAuthenticated ? 
                "Your personalized skill categories with real-time progress tracking and smart recommendations." :
                "Quick‑hit categories with beginner‑friendly guides and checklists."
              }
            </p>
          </motion.div>

          {/* Enhanced Category Grid */}
          <div className="grid gap-5 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category, index) => {
              const categoryProgress = getCategoryProgress(category.key);
              
              // Define category-specific configurations
              const categoryConfig = {
                'life-skills': {
                  gradient: 'from-indigo-50/90 via-white to-indigo-100/60 dark:from-indigo-900/40 dark:via-zinc-800/60 dark:to-indigo-800/30',
                  progressGradient: 'from-indigo-500 via-indigo-600 to-purple-600',
                  iconGradient: 'from-indigo-500 to-indigo-600',
                  glow: 'group-hover:shadow-indigo-500/25',
                  accentColor: 'indigo'
                },
                'money-finance': {
                  gradient: 'from-emerald-50/90 via-white to-emerald-100/60 dark:from-emerald-900/40 dark:via-zinc-800/60 dark:to-emerald-800/30',
                  progressGradient: 'from-emerald-500 via-emerald-600 to-teal-600',
                  iconGradient: 'from-emerald-500 to-emerald-600',
                  glow: 'group-hover:shadow-emerald-500/25',
                  accentColor: 'emerald'
                },
                'health': {
                  gradient: 'from-rose-50/90 via-white to-rose-100/60 dark:from-rose-900/40 dark:via-zinc-800/60 dark:to-rose-800/30',
                  progressGradient: 'from-rose-500 via-rose-600 to-pink-600',
                  iconGradient: 'from-rose-500 to-rose-600',
                  glow: 'group-hover:shadow-rose-500/25',
                  accentColor: 'rose'
                },
                'living': {
                  gradient: 'from-purple-50/90 via-white to-purple-100/60 dark:from-purple-900/40 dark:via-zinc-800/60 dark:to-purple-800/30',
                  progressGradient: 'from-purple-500 via-purple-600 to-violet-600',
                  iconGradient: 'from-purple-500 to-purple-600',
                  glow: 'group-hover:shadow-purple-500/25',
                  accentColor: 'purple'
                },
                'career': {
                  gradient: 'from-amber-50/90 via-white to-amber-100/60 dark:from-amber-900/40 dark:via-zinc-800/60 dark:to-amber-800/30',
                  progressGradient: 'from-amber-500 via-amber-600 to-orange-600',
                  iconGradient: 'from-amber-500 to-amber-600',
                  glow: 'group-hover:shadow-amber-500/25',
                  accentColor: 'amber'
                }
              };

              const config = categoryConfig[category.key] || categoryConfig['life-skills'];

              return (
                <motion.div 
                  key={category.key} 
                  initial={{ opacity: 0, y: 20, scale: 0.9 }} 
                  whileInView={{ opacity: 1, y: 0, scale: 1 }} 
                  viewport={{ once: true }} 
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card 
                    className={`group relative h-full border-0 bg-gradient-to-br ${config.gradient} backdrop-blur-sm cursor-pointer transition-all duration-500 hover:shadow-2xl hover:scale-105 ${config.glow} overflow-hidden`}
                    onClick={() => {
                      console.log('Card clicked:', category.key);
                      navigate(`/category/${category.key}`);
                    }}
                  >
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${config.accentColor}-200/30 to-${config.accentColor}-300/30 dark:from-${config.accentColor}-800/20 dark:to-${config.accentColor}-700/20 rounded-full blur-2xl transform translate-x-16 -translate-y-16`}></div>
                      <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-${config.accentColor}-300/30 to-${config.accentColor}-200/30 dark:from-${config.accentColor}-700/20 dark:to-${config.accentColor}-800/20 rounded-full blur-xl transform -translate-x-12 translate-y-12`}></div>
                    </div>

                    <div className="relative z-10 p-5 sm:p-6 h-full flex flex-col">
                      {/* Header with Icon and Progress */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16">
                          {/* Icon container */}
                          <div className={`absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br ${config.iconGradient} text-white shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                            {React.createElement(category.icon, { className: "h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" })}
                          </div>
                          {/* Progress Ring Around Icon */}
                          {categoryProgress.total > 0 && (
                            <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-zinc-200 dark:text-zinc-700" />
                              <motion.circle 
                                cx="24" 
                                cy="24" 
                                r="22" 
                                stroke={`url(#${category.key}-gradient)`} 
                                strokeWidth="2" 
                                fill="transparent"
                                strokeDasharray={`${2 * Math.PI * 22}`}
                                strokeDashoffset={`${2 * Math.PI * 22 * (1 - categoryProgress.percentage / 100)}`}
                                strokeLinecap="round"
                                initial={{ strokeDashoffset: `${2 * Math.PI * 22}` }}
                                whileInView={{ strokeDashoffset: `${2 * Math.PI * 22 * (1 - categoryProgress.percentage / 100)}` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.2 + 0.5 }}
                              />
                              <defs>
                                <linearGradient id={`${category.key}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#10b981" />
                                  <stop offset="100%" stopColor="#059669" />
                                </linearGradient>
                              </defs>
                            </svg>
                          )}
                        </div>
                        
                        {/* Progress Badge */}
                      {categoryProgress.completed > 0 && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 + 0.8, type: "spring", stiffness: 300 }}
                            className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-lg"
                          >
                            <Trophy className="h-3 w-3" />
                          {categoryProgress.percentage}%
                          </motion.div>
                      )}
                    </div>

                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {category.desc}
                        </p>

                        {/* Enhanced Progress Section */}
                    {categoryProgress.total > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-zinc-500 dark:text-zinc-400">Progress</span>
                              <span className="font-semibold text-zinc-900 dark:text-white">
                                {categoryProgress.completed}/{categoryProgress.total} tasks
                              </span>
                        </div>
                            
                            {/* Enhanced Progress Bar */}
                            <div className="relative w-full bg-zinc-200/80 dark:bg-zinc-700/80 rounded-full h-2.5 overflow-hidden">
                              <motion.div
                                className={`h-2.5 rounded-full bg-gradient-to-r ${config.progressGradient} shadow-sm relative overflow-hidden`}
                                initial={{ width: 0 }}
                                whileInView={{ width: `${categoryProgress.percentage}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.2 + 0.7 }}
                              >
                                {/* Shimmer effect */}
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                  animate={{ x: ['-100%', '100%'] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: index * 0.3 }}
                                  style={{ width: '50%' }}
                                />
                              </motion.div>
                        </div>

                            {/* Progress Status */}
                            {categoryProgress.completed > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 + 1 }}
                                className="flex items-center gap-2 text-sm"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  {categoryProgress.percentage === 100 ? 'Completed!' : 'In Progress'}
                                </span>
                              </motion.div>
                            )}
                      </div>
                    )}
                      </div>

                      {/* Enhanced Action Button */}
                      <motion.div
                        className="mt-5 sm:mt-6"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.06 + 0.5 }}
                      >
                      <Button 
                          className={`w-full rounded-xl bg-gradient-to-r ${config.iconGradient} text-white hover:shadow-lg transition-all duration-200 group-hover:scale-105 border-0`}
                          icon={categoryProgress.completed > 0 ? ChevronRight : Rocket}
                        onClick={(e) => {
                          e.stopPropagation();
                            console.log('Button clicked:', category.key);
                            navigate(`/category/${category.key}`);
                        }}
                      >
                          {categoryProgress.completed > 0 ? 'Continue Learning' : 'Start Journey'}
                    </Button>
                      </motion.div>

                      {/* Smart Recommendations */}
                      {isAuthenticated && categoryProgress.total > 0 && categoryProgress.completed < categoryProgress.total && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 + 1.4 }}
                          className={`mt-3 text-xs px-3 py-2 rounded-xl bg-${config.accentColor}-100 dark:bg-${config.accentColor}-900/30 text-${config.accentColor}-700 dark:text-${config.accentColor}-300 text-center font-medium`}
                        >
                          💡 {categoryProgress.total - categoryProgress.completed} tasks remaining
                        </motion.div>
                      )}

                      {/* Hover Arrow */}
                      <motion.div
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        whileHover={{ x: 2 }}
                      >
                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                      </motion.div>
                  </div>
                </Card>
              </motion.div>
              );
            })}
          </div>

          {/* Quick Stats Summary for Authenticated Users */}
          {isAuthenticated && progress && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-10 sm:mt-16 text-center"
            >
              <div className="inline-flex items-center gap-4 sm:gap-8 px-5 sm:px-8 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-white/80 via-zinc-50/80 to-white/80 dark:from-zinc-900/80 dark:via-zinc-800/80 dark:to-zinc-900/80 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center">
                    <Target className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <span className="font-bold text-zinc-900 dark:text-white">{progress.completedTasks?.length || 0}</span> tasks
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <Zap className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <span className="font-bold text-zinc-900 dark:text-white">{progress.totalPoints || 0}</span> XP
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center">
                    <Trophy className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    <span className="font-bold text-zinc-900 dark:text-white">{progress.unlockedAchievements?.length || 0}</span> achv
                  </span>
                </div>
              </div>
              {isAuthenticated && (
                <div className="mt-4">
                  {activePlan ? (
                    <Button className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => { window.location.assign('/plan'); }} icon={ChevronRight}>
                      Resume Your Plan
                    </Button>
                  ) : (
                    <Button className="rounded-2xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800" onClick={() => generatePlan()} icon={Rocket}>
                      Create My Plan
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </Container>
      </section>

      {/* Quiz */}
      <section id="quiz" className="border-y border-zinc-100/70 py-12 sm:py-16 dark:border-zinc-900/60">
        <Container>
          <SectionTitle
            eyebrow="Personalized Start"
            title="Not sure where to begin? Take a 60‑second quiz."
            desc="We’ll point you to the next 2–4 actions that give you the biggest win right now."
          />

          <Card>
            {!showQuiz ? (
              <div className="flex flex-col items-center gap-3 sm:gap-4 py-6 sm:py-8 text-center">
                <HeartHandshake className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <p className="max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                  Answer a few quick questions about health, money, and living situation. No signup needed.
                </p>
                <Button className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-3 text-base sm:px-6 sm:py-3.5 sm:text-sm" onClick={() => setShowQuiz(true)} icon={CheckCircle2}>
                  Start Quiz
                </Button>
              </div>
            ) : (
              <div>
                {quizStep < COMPREHENSIVE_QUIZ.length ? (
              <div>
                <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Step {quizStep + 1} of {COMPREHENSIVE_QUIZ.length}</p>
                  <div className="flex gap-1">
                        {COMPREHENSIVE_QUIZ.map((_, i) => (
                          <div key={i} className={`h-1.5 w-8 rounded-full ${i <= quizStep ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"}`} />
                    ))}
                  </div>
                </div>
                <div className="mt-6">
                      <div className="mb-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {COMPREHENSIVE_QUIZ[quizStep].category}
                        </span>
                      </div>
                      <h4 className="text-lg font-semibold">{COMPREHENSIVE_QUIZ[quizStep].q}</h4>
                      <div className="mt-4 grid gap-3">
                        {COMPREHENSIVE_QUIZ[quizStep].options.map((opt) => (
                      <button
                            key={opt.value}
                        onClick={() => {
                              const key = COMPREHENSIVE_QUIZ[quizStep].key;
                          const next = { ...answers, [key]: opt };
                          setAnswers(next);
                              if (quizStep < COMPREHENSIVE_QUIZ.length - 1) setQuizStep(quizStep + 1);
                        }}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                            {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <Button
                      className="rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => setQuizStep((s) => Math.max(0, s - 1))}
                    >
                      Back
                    </Button>
                        {quizStep < COMPREHENSIVE_QUIZ.length - 1 ? (
                          <Button className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setQuizStep((s) => Math.min(COMPREHENSIVE_QUIZ.length - 1, s + 1))}>
                        Next
                      </Button>
                    ) : (
                          <Button 
                            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" 
                            onClick={() => {
                          // Complete quiz
                              setQuizStep(COMPREHENSIVE_QUIZ.length);
                          // Build minimal profile from answers
                          const profile = {
                            age: answers?.age?.value,
                            living: answers?.living?.value,
                            employment: answers?.employment?.value,
                            timePerWeek: answers?.time?.value,
                            tags: [
                              answers?.living?.value === 'moving-soon' ? 'moving-out' : null,
                              answers?.employment?.value === 'job-hunting' ? 'job' : null,
                              answers?.employment?.value === 'in-school' ? 'student' : null,
                            ].filter(Boolean),
                          };
                          try { localStorage.setItem('growup-user-profile', JSON.stringify(profile)); } catch {}
                          // Signal plans hook to generate
                          try { window.dispatchEvent(new CustomEvent('growup-generate-plan')); } catch {}
                              setTimeout(() => {
                                const resultsElement = document.querySelector('[data-results-section]');
                                if (resultsElement) {
                                  resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                          }, 120);
                            }}
                          >
                            See My Personal Plan
                      </Button>
                    )}
                  </div>
                </div>
                          </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      <h3 className="text-lg font-semibold">Quiz Complete!</h3>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                      Your personalized plan is ready. Scroll down to see your results.
                    </p>
                    <Button 
                      className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      onClick={() => {
                        setAnswers({});
                        setQuizStep(0);
                      }}
                    >
                      Retake Quiz
                    </Button>
                        </div>
                      )}

                {/* Comprehensive Results */}
                {(() => {
                  console.log('Results condition check:', {
                    quizResults: !!quizResults,
                    quizStep,
                    quizLength: COMPREHENSIVE_QUIZ.length,
                    condition: quizResults && quizStep >= COMPREHENSIVE_QUIZ.length
                  });
                  return (quizResults && quizStep >= COMPREHENSIVE_QUIZ.length);
                })() && (
                  <div className="mt-8 space-y-6" data-results-section>
                    {/* Age Group & Milestone Progress */}
                    {quizResults.ageGroup && (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/30">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                          <h5 className="font-semibold text-indigo-900 dark:text-indigo-100">{quizResults.ageGroup.label}</h5>
                    </div>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
                          {quizResults.ageGroup.description}
                        </p>
                        
                        {/* Milestone Progress */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Milestone Progress</span>
                            <span className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                              {quizResults.milestoneAnalysis?.completionRate || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-indigo-200 rounded-full h-2 dark:bg-indigo-800">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${quizResults.milestoneAnalysis?.completionRate || 0}%` }}
                            />
                          </div>
                          
                          {/* Benchmark Status */}
                          {quizResults.ageBenchmark && (
                            <div className={`rounded-lg p-3 text-sm ${
                              quizResults.ageBenchmark.status === 'ahead' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200' :
                              quizResults.ageBenchmark.status === 'behind' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                {quizResults.ageBenchmark.status === 'ahead' && <CheckCircle2 className="h-4 w-4" />}
                                {quizResults.ageBenchmark.status === 'behind' && <AlertCircle className="h-4 w-4" />}
                                {quizResults.ageBenchmark.status === 'developing' && <Clock className="h-4 w-4" />}
                                {quizResults.ageBenchmark.status === 'on_track' && <Target className="h-4 w-4" />}
                                <span className="font-medium">
                                  {quizResults.ageBenchmark.status === 'ahead' && 'Ahead of Peers'}
                                  {quizResults.ageBenchmark.status === 'behind' && 'Room for Growth'}
                                  {quizResults.ageBenchmark.status === 'developing' && 'Developing Well'}
                                  {quizResults.ageBenchmark.status === 'on_track' && 'On Track'}
                                </span>
                              </div>
                              <p>{quizResults.ageBenchmark.message}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Peer Comparison */}
                    {quizResults.peerComparison && (
                      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/30">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <h5 className="font-semibold text-purple-900 dark:text-purple-100">How You Compare to Peers</h5>
                        </div>
                        <div className="grid gap-3">
                          {quizResults.peerComparison.map((comparison, i) => (
                            <div key={i} className="bg-white rounded-lg p-3 border border-purple-200 dark:bg-purple-900/50 dark:border-purple-700">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-purple-900 dark:text-purple-100">{comparison.area}</span>
                                <span className="text-sm text-purple-700 dark:text-purple-300">{comparison.userStatus}</span>
                              </div>
                              <p className="text-xs text-purple-600 dark:text-purple-400">{comparison.peerBenchmark}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Urgent Tasks */}
                    {quizResults.urgentTasks && quizResults.urgentTasks.length > 0 && (
                      <div>
                        <h5 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-600 dark:text-red-400 mb-3">
                          <AlertCircle className="h-4 w-4" />
                          {quizResults.ageGroup ? `Priority for ${quizResults.ageGroup.label}` : 'Urgent Actions'}
                        </h5>
                        <div className="grid gap-3">
                          {quizResults.urgentTasks.map((task, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
                              <div className="rounded-lg bg-red-100 p-1 text-red-600 dark:bg-red-800 dark:text-red-300">
                                <Target className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <h6 className="font-medium text-red-900 dark:text-red-100">{task.title}</h6>
                                <p className="text-sm text-red-700 dark:text-red-300">{task.reason}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {task.ageAppropriate && (
                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-800 dark:text-red-200">
                                      Age-appropriate
                                    </span>
                                  )}
                                  {task.basedOnAnswer && (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                                      Based on: {task.basedOnAnswer}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Wins */}
                    {quizResults.quickWins && quizResults.quickWins.length > 0 && (
                      <div>
                        <h5 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-3">
                          <Zap className="h-4 w-4" />
                          Quick Confidence Builders
                        </h5>
                        <div className="grid gap-3">
                          {quizResults.quickWins.map((win, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/30">
                              <div className="rounded-lg bg-emerald-100 p-1 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-300">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <h6 className="font-medium text-emerald-900 dark:text-emerald-100">{win.title}</h6>
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">{win.reason}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {win.ageAppropriate && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
                                      Perfect for your age
                                    </span>
                                  )}
                                  {win.basedOnAnswer && (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                                      Based on: {win.basedOnAnswer}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Main Recommendations */}
                    {quizResults.recommendations && quizResults.recommendations.length > 0 && (
                      <div>
                        <h5 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 mb-3">
                          <TrendingUp className="h-4 w-4" />
                          {quizResults.ageGroup ? `Building Toward ${quizResults.ageGroup.nextStage}` : 'Recommended Next Steps'}
                        </h5>
                        <div className="grid gap-3">
                          {quizResults.recommendations.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                              <div className="rounded-lg bg-zinc-100 p-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                <Rocket className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <h6 className="font-medium">{rec.title}</h6>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">{rec.reason}</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {rec.ageAppropriate && (
                                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200">
                                      Age-appropriate goal
                                    </span>
                                  )}
                                  {rec.basedOnAnswer && (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                                      Based on: {rec.basedOnAnswer}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next Life Stage Preview */}
                    {quizResults.ageGroup && quizResults.ageBenchmark?.status === 'ahead' && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <h5 className="font-semibold text-amber-900 dark:text-amber-100">Ready for What's Next?</h5>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                          You're ahead of your peers! Consider preparing for: <strong>{quizResults.ageGroup.nextStage}</strong>
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          This positions you well for future success and gives you a competitive advantage.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button 
                        className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                        onClick={() => {
                          setShowQuiz(false);
                          setQuizStep(0);
                          document.getElementById("essentials")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        icon={Rocket}
                      >
                        Start Learning
                      </Button>
                      <Button 
                        className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        onClick={() => {
                          setAnswers({});
                          setQuizStep(0);
                        }}
                      >
                        Retake Quiz
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Container>
      </section>

      {/* Guides */}
      <section id="guides" className="py-14">
        <Container>
          <SectionTitle eyebrow="Featured Guides" title="Learn by doing" desc="Hand‑picked articles to get quick wins this week." />

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {categoryTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  activeFilter === tab
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {filteredGuides.map((g, idx) => (
              <motion.div key={`${g.categoryKey}-${g.title}-${idx}`} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
                <Card>
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {React.createElement(g.icon, { className: "h-5 w-5" })}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{g.title}</h3>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{g.summary}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                        <BookOpen className="h-4 w-4" />
                        <span>{g.category}</span>
                      </div>
                      <div className="mt-4">
                        <Button className="rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800" icon={ChevronRight}>
                          Read Guide
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Empty state */}
          {filteredGuides.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800">
              No results. Try a different search or category.
            </div>
          )}
        </Container>
      </section>

      {/* Newsletter / App CTA */}
      <section id="newsletter" className="border-y border-zinc-100/70 py-16 dark:border-zinc-900/60">
        <Container>
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <SectionTitle
                eyebrow="Weekly Tips"
                title="Adulting in 5 minutes a week"
                desc="Short, practical emails with one new habit or checklist. Unsubscribe anytime."
              />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Thanks! We'll send tips soon.");
                }}
                className="flex w-full max-w-md items-center gap-2"
              >
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900"
                />
                <Button type="submit" className="h-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Subscribe</Button>
              </form>
              <p className="mt-2 text-xs text-zinc-500">We respect your time. One email. Zero spam.</p>
            </div>
            <Card>
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-zinc-100 p-2 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Take Grow Up anywhere</h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Save guides, check off tasks, and get gentle reminders. iOS & Android apps coming soon.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800" icon={Smartphone}>
                      iOS (Soon)
                    </Button>
                    <Button className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800" icon={Smartphone}>
                      Android (Soon)
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Container>
      </section>

      {/* Footer */}
      <footer className="py-10">
        <Container>
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-bold">Grow Up</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Plain‑English guides for real‑life tasks. One step at a time.</p>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Explore</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {CATEGORIES.map((c) => (
                  <li key={c.key}>
                    <button 
                      onClick={() => navigate(`/category/${c.key}`)}
                      className="hover:text-zinc-900 dark:hover:text-zinc-100 text-left"
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Company</h4>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li><a className="hover:text-zinc-900 dark:hover:text-zinc-100" href="#">About</a></li>
                <li><a className="hover:text-zinc-900 dark:hover:text-zinc-100" href="#">Contact</a></li>
                <li><a className="hover:text-zinc-900 dark:hover:text-zinc-100" href="#">FAQs</a></li>
                <li><a className="hover:text-zinc-900 dark:hover:text-zinc-100" href="#">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Get updates</h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Thanks for subscribing!");
                }}
                className="flex items-center gap-2"
              >
                <input type="email" placeholder="Email" className="h-10 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900" />
                <Button type="submit" className="h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" icon={Mail}>Sign up</Button>
              </form>
            </div>
          </div>
          <div className="mt-8 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
            © {new Date().getFullYear()} Grow Up. All rights reserved.
          </div>
        </Container>
      </footer>

      {/* Mobile Profile FAB - Only show on mobile when authenticated */}
      {isAuthenticated && (
        <div className="fixed bottom-6 right-6 sm:hidden z-40">
          <Link to="/profile">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 shadow-2xl flex items-center justify-center hover:shadow-3xl hover:scale-105 transition-all duration-300 group">
              <User className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
              {progress?.currentStreak > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Flame className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// -----------------------------
// Your Plan Page (MVP)
// -----------------------------
function YourPlanPage() {
  const { activePlan, generatePlan, toggleTaskInPlan, completeWeekInPlan } = usePlansContext();
  const { isAuthenticated } = useAuthContext();
  const { isDark, toggle } = useThemeToggle();
  const navigate = useNavigate();
  const plan = activePlan;
  const overall = React.useMemo(() => {
    if (!plan) return { completed: 0, total: 0, percent: 0 };
    const all = plan.weeks.flatMap(w => w.tasks);
    const completed = all.filter(t => t.completed).length;
    const total = all.length || 1;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  }, [plan]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold tracking-tight">Your Plan</span>
          </div>
          <div className="flex items-center gap-3">
            <Button aria-label="Toggle theme" onClick={toggle} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800" icon={isDark ? Sun : Moon}>
              <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
            </Button>
            <Button onClick={() => navigate('/')} className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800" icon={ChevronRight}>Home</Button>
          </div>
        </Container>
      </header>

      <main className="py-10">
        <Container>
          {!plan ? (
            <Card className="text-center">
              <h2 className="text-xl font-bold mb-2">No active plan yet</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Generate a personalized plan based on your profile.</p>
              <Button className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => generatePlan()} icon={Rocket}>Generate Plan</Button>
            </Card>
          ) : (
            <div className="space-y-6">
              <SectionTitle eyebrow="Personalized" title="Your weekly plan" desc="Stay on track with a simple weekly checklist." />
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">Overall progress</div>
                  <div className="text-xs text-zinc-500">{overall.completed}/{overall.total} done</div>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500" style={{ width: `${overall.percent}%` }} />
                </div>
              </Card>
              {plan.weeks.map((w, idx) => {
                const completed = w.tasks.filter(t => t.completed).length;
                const total = w.tasks.length || 1;
                const percent = Math.round((completed / total) * 100);
                return (
                  <Card key={idx} className="overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold">Week {idx + 1}</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-zinc-500">{completed}/{total} done</div>
                        {completed < total && (
                          <Button className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs px-3 py-1" onClick={() => completeWeekInPlan(idx)}>Mark Week Complete</Button>
                        )}
                      </div>
                    </div>
                    <div className="mb-4 h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-500" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="space-y-2">
                      {w.tasks.map(t => (
                        <button key={t.id} onClick={() => toggleTaskInPlan(t.id)} className={`w-full flex items-center gap-3 text-sm rounded-lg px-3 py-2 transition ${t.completed ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                          <CheckSquare className={`h-4 w-4 ${t.completed ? 'text-emerald-600' : 'text-zinc-400'}`} />
                          <span className={`flex-1 text-left ${t.completed ? 'line-through text-zinc-400' : ''}`}>{t.guideId}</span>
                          <Link to={`/guide/${t.guideId}`} className="text-indigo-600 dark:text-indigo-400 hover:underline text-xs">Open</Link>
                        </button>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}

// -----------------------------
// Guide Detail Page (MVP)
// -----------------------------
function GuideDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const normalize = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
  const slugify = (s) => normalize(s).replace(/\s+/g, '-');

  const guide = useMemo(() => {
    const all = getAllGuides();
    const exact = all.find(g => g.id === slug || g.key === slug || slugify(g.title) === slug);
    if (exact) return exact;
    // fallback: broad search using upgraded searchGuides
    const results = searchGuides(slug.replace(/-/g, ' '));
    return results[0] || null;
  }, [slug]);

  if (!guide) {
    return (
      <div className="min-h-screen grid place-items-center text-center p-6">
        <div>
          <h2 className="text-xl font-bold mb-2">Guide not found</h2>
          <Button className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold tracking-tight">Guide</span>
          </div>
          <Button onClick={() => navigate(-1)} className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800" icon={ChevronRight}>Back</Button>
        </Container>
      </header>

      <main className="py-10">
        <Container>
          <div className="mb-6">
            <Badge>{guide.categoryName}</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">{guide.title}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-2xl">{guide.summary}</p>

          <Card>
            <h3 className="font-semibold mb-3">Steps</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {(guide.steps || []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Card>
        </Container>
      </main>
    </div>
  );
}

// -----------------------------
// Protected Route Components
// -----------------------------
function ProtectedHomePage() {
  const { isAuthenticated, user } = useAuthContext();
  
  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <LandingPage />;
  }
  // Gate on email verification
  if (user && user.emailVerified === false) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-xl font-bold mb-2">Verify your email</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">We sent a verification link to {user.email}. Please verify and refresh.</p>
        </div>
      </div>
    );
  }
  
  // Show main platform for authenticated users
  return <HomePage />;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuthContext();
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  if (!isAuthenticated) {
    return <LandingPage />;
  }
  if (user && user.emailVerified === false) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md">
          <h2 className="text-xl font-bold mb-2">Verify your email</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">We sent a verification link to {user.email}. Please verify and refresh.</p>
        </div>
      </div>
    );
  }
  
  return children;
}

// -----------------------------
// Activity Calendar Component
// -----------------------------
const ActivityCalendar = ({ dailyActivity, currentStreak }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get calendar data for the current month
  const getCalendarData = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        const dateStr = currentDate.toDateString();
        const activity = dailyActivity[dateStr];
        const isCurrentMonth = currentDate.getMonth() === month;
        const isToday = currentDate.toDateString() === new Date().toDateString();
        
        days.push({
          date: new Date(currentDate),
          dateStr,
          activity,
          isCurrentMonth,
          isToday,
          dayNumber: currentDate.getDate()
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return days;
  };
  
  const calendarDays = getCalendarData();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const getActivityLevel = (activity) => {
    if (!activity || (activity.tasks === 0 && activity.guides === 0)) return 0;
    const totalActivity = activity.tasks + activity.guides * 3; // Weight guides more
    if (totalActivity >= 10) return 4;
    if (totalActivity >= 6) return 3;
    if (totalActivity >= 3) return 2;
    return 1;
  };
  
  const getActivityColor = (level) => {
    switch (level) {
      case 4: return 'bg-emerald-600 dark:bg-emerald-500';
      case 3: return 'bg-emerald-500 dark:bg-emerald-400';
      case 2: return 'bg-emerald-400 dark:bg-emerald-300';
      case 1: return 'bg-emerald-200 dark:bg-emerald-600';
      default: return 'bg-zinc-100 dark:bg-zinc-800';
    }
  };
  
  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };
  
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold">Activity Calendar</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-bold text-orange-600 dark:text-orange-400">{currentStreak} day streak</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="font-medium text-sm min-w-[100px] text-center">
            {monthNames[currentMonth.getMonth()].slice(0, 3)} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-3">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 py-1">
            {day}
          </div>
        ))}
        
        {calendarDays.map((day, index) => {
          const activityLevel = getActivityLevel(day.activity);
          const colorClass = getActivityColor(activityLevel);
          
          return (
            <div
              key={index}
              className={`
                w-4 h-4 flex items-center justify-center text-xs rounded-sm cursor-pointer
                transition-all duration-200 hover:scale-125 relative group
                ${day.isCurrentMonth ? 'opacity-100' : 'opacity-40'}
                ${day.isToday ? 'ring-1 ring-blue-500 dark:ring-blue-400' : ''}
                ${colorClass}
              `}
              title={day.activity ? 
                `${day.activity.tasks} tasks, ${day.activity.guides} guides` : 
                'No activity'
              }
            >
              {/* Tooltip */}
              {day.activity && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black dark:bg-white text-white dark:text-black text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                  {day.activity.tasks} tasks, {day.activity.guides} guides
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-black dark:border-t-white"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Compact Legend */}
      <div className="flex items-center justify-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="text-xs">Less</span>
        <div className="flex items-center gap-0.5">
          <div className="w-2 h-2 rounded-sm bg-zinc-100 dark:bg-zinc-800"></div>
          <div className="w-2 h-2 rounded-sm bg-emerald-200 dark:bg-emerald-600"></div>
          <div className="w-2 h-2 rounded-sm bg-emerald-400 dark:bg-emerald-300"></div>
          <div className="w-2 h-2 rounded-sm bg-emerald-500 dark:bg-emerald-400"></div>
          <div className="w-2 h-2 rounded-sm bg-emerald-600 dark:bg-emerald-500"></div>
        </div>
        <span className="text-xs">More</span>
      </div>
    </Card>
  );
};

// -----------------------------
// User Profile with Progress Dashboard
// -----------------------------
const UserProfile = () => {
  const { user } = useAuthContext();
  const { progress, getLevel, toggleTask, completeGuide } = useGameProgress();
  const { financialData, saveFinancialData, getFinancialComparison, hasAssessment } = useFinancialAssessment();
  const { theme, isDark, toggle } = useThemeToggle();
  const navigate = useNavigate();
  const [showFinancialAssessment, setShowFinancialAssessment] = useState(false);
  const [assessmentData, setAssessmentData] = useState({
    age: '',
    income: '',
    savings: '',
    checking: '',
    creditScore: '',
    debt: ''
  });

  const handleFinancialSubmit = (e) => {
    e.preventDefault();
    const data = {
      age: parseInt(assessmentData.age),
      income: parseFloat(assessmentData.income) || 0,
      savings: parseFloat(assessmentData.savings) || 0,
      checking: parseFloat(assessmentData.checking) || 0,
      creditScore: parseInt(assessmentData.creditScore) || 0,
      debt: parseFloat(assessmentData.debt) || 0
    };
    
    saveFinancialData(data);
    setShowFinancialAssessment(false);
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'Not provided';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPercentileColor = (percentile) => {
    if (percentile >= 75) return 'text-emerald-600 dark:text-emerald-400';
    if (percentile >= 50) return 'text-blue-600 dark:text-blue-400';
    if (percentile >= 25) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPercentileLabel = (percentile) => {
    if (percentile >= 90) return 'Top 10%';
    if (percentile >= 75) return 'Top 25%';
    if (percentile >= 50) return 'Above Average';
    if (percentile >= 25) return 'Below Average';
    return 'Bottom 25%';
  };

  // Safety check - don't render if user data isn't loaded yet
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Calculate comprehensive statistics
  const calculateStats = useMemo(() => {
    const allCategories = ['life-skills', 'money-finance', 'health', 'living', 'career'];
    let totalTasks = 0;
    let completedTasks = 0;
    let totalTimeSpent = 0;
    let totalMoney = 0;
    let sectionProgress = {};

    allCategories.forEach(category => {
      const guides = DETAILED_GUIDES[category] || [];
      let categoryTotal = 0;
      let categoryCompleted = 0;
      let categoryTime = 0;

      guides.forEach(guide => {
        if (guide.tasks && Array.isArray(guide.tasks)) {
          guide.tasks.forEach(task => {
            categoryTotal++;
            totalTasks++;
            
            if (progress?.completedTasks?.includes(task.id)) {
              categoryCompleted++;
              completedTasks++;
              
              // Calculate time saved from micro-actions
              if (task.microActions) {
                task.microActions.forEach(action => {
                  if (action.time) {
                    const timeMatch = action.time.match(/(\d+)\s*(min|hour)/);
                    if (timeMatch) {
                      const value = parseInt(timeMatch[1]);
                      const unit = timeMatch[2];
                      categoryTime += unit === 'hour' ? value * 60 : value;
                    }
                  }
                });
              }
            }
          });
        }
      });

      totalTimeSpent += categoryTime;
      sectionProgress[category] = {
        completed: categoryCompleted,
        total: categoryTotal,
        percentage: categoryTotal > 0 ? Math.round((categoryCompleted / categoryTotal) * 100) : 0,
        timeSpent: categoryTime
      };
    });

    // Calculate achievements earned
    const achievements = ACHIEVEMENTS.filter(achievement => {
      // Check if achievement is already unlocked
      if (progress?.unlockedAchievements?.includes(achievement.id)) {
        return true;
      }
      
      switch(achievement.requirement.type) {
        case "guides_completed":
          return (progress?.completedGuides?.length || 0) >= achievement.requirement.count;
        case "tasks_completed":
          return (progress?.completedTasks?.length || 0) >= achievement.requirement.count;
        case "points_earned":
          return (progress?.totalPoints || 0) >= achievement.requirement.count;
        case "category_completed":
          const categoryKey = achievement.requirement.category;
          const categoryProgress = sectionProgress[categoryKey];
          return categoryProgress && categoryProgress.percentage === 100;
        case "category_started":
          const startedCategoryProgress = sectionProgress[achievement.requirement.category];
          return startedCategoryProgress && startedCategoryProgress.completed > 0;
        case "category_progress":
          const catProgress = sectionProgress[achievement.requirement.category];
          return catProgress && catProgress.completed >= achievement.requirement.count;
        case "all_categories_touched":
        case "categories_touched":
          const touchedCategories = Object.keys(sectionProgress).filter(cat => sectionProgress[cat].completed > 0);
          return touchedCategories.length >= achievement.requirement.count;
        case "categories_mastered":
          const masteredCategories = Object.keys(sectionProgress).filter(cat => sectionProgress[cat].percentage === 100);
          return masteredCategories.length >= achievement.requirement.count;
        case "balanced_progress":
          const balancedCategories = Object.keys(sectionProgress).filter(cat => 
            sectionProgress[cat].completed >= achievement.requirement.count
          );
          return balancedCategories.length >= achievement.requirement.count;
        case "streak":
          return (progress?.currentStreak || 0) >= achievement.requirement.count;
        case "active_days":
          return Object.keys(progress?.dailyActivity || {}).length >= achievement.requirement.count;
        case "level_reached":
          const level = Math.floor((progress?.totalPoints || 0) / 500) + 1;
          return level >= achievement.requirement.count;
        case "guides_in_day":
        case "tasks_in_day":
        case "weekend_active":
        case "early_completion":
        case "late_completion":
        case "perfect_guides":
        case "streak_recovery":
        case "perfect_month":
        case "perfect_year":
        case "all_achievements":
          // These require more complex tracking - implement later
          return false;
        default:
          return false;
      }
    });

    return {
      totalTasks,
      completedTasks,
      overallProgress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      totalTimeSpent,
      sectionProgress,
      achievements,
      nextMilestone: ACHIEVEMENTS.find(a => !achievements.includes(a))
    };
  }, [progress?.completedTasks]);

  const stats = calculateStats;

  const categoryNames = {
    'life-skills': 'Life Skills',
    'money-finance': 'Money & Finance',
    'health': 'Health & Wellness', 
    'living': 'Living on Your Own',
    'career': 'Work & Career'
  };

  const categoryIcons = {
    'life-skills': GraduationCap,
    'money-finance': Wallet,
    'health': Stethoscope,
    'living': Home,
    'career': Briefcase
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-white text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-black dark:text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-white/70 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/60">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/20 to-sky-400/20 blur"></div>
              <div className="relative flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 dark:bg-zinc-900">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm font-bold tracking-tight">Grow Up</span>
              </div>
            </Link>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Profile</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Toggle theme"
              onClick={toggle}
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              icon={isDark ? Sun : Moon}
            >
              <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              Back to Home
            </Button>
          </div>
        </Container>
      </header>

      <Container className="py-8">
        {/* Profile Header */}
        <Card className="mb-8 overflow-hidden hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/80 dark:from-zinc-900/80 dark:via-zinc-800/80 dark:to-indigo-900/20">
          <div className="relative p-8">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100/40 to-sky-100/40 dark:from-indigo-900/20 dark:to-sky-900/20 rounded-full blur-3xl transform translate-x-32 -translate-y-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-sky-100/40 to-indigo-100/40 dark:from-sky-900/20 dark:to-indigo-900/20 rounded-full blur-2xl transform -translate-x-24 translate-y-24"></div>
            
            <div className="relative flex items-center gap-6">
              <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-full flex items-center justify-center shadow-xl">
                <User className="h-12 w-12 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2 text-zinc-900 dark:text-white tracking-tight">
                  {user?.name || user?.email?.split('@')[0] || 'Welcome!'}
                </h1>
                <p className="text-zinc-600 dark:text-zinc-300 text-lg mb-4">
                  {user?.email}
                </p>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Zap className="h-4 w-4" />
                    <span className="font-medium">{progress?.totalPoints || 0} XP Points</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">{stats.achievements.length} Achievements</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/70 dark:bg-zinc-800/70 backdrop-blur-sm rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50 shadow-lg">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Overall Progress</p>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.overallProgress}%</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{stats.completedTasks}/{stats.totalTasks} tasks</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Hero Stats Section */}
        <div className="mb-12 relative">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 via-transparent to-sky-50/30 dark:from-indigo-900/10 dark:to-sky-900/10 rounded-3xl"></div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-indigo-200/20 to-sky-200/20 dark:from-indigo-800/10 dark:to-sky-800/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-200/20 to-teal-200/20 dark:from-emerald-800/10 dark:to-teal-800/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
          
          <div className="relative z-10 p-8">
            {/* Header with motivational copy */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 dark:from-indigo-400 dark:via-purple-400 dark:to-sky-400 bg-clip-text text-transparent mb-4">
                  {stats.overallProgress < 25 ? "🚀 Your Journey Begins!" : 
                   stats.overallProgress < 50 ? "⚡ Building Momentum!" :
                   stats.overallProgress < 75 ? "🔥 You're On Fire!" : "🏆 Almost There!"}
          </h2>
                <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto">
                  {stats.overallProgress < 25 ? "Every expert was once a beginner. You've got this!" :
                   stats.overallProgress < 50 ? "You're making real progress! Keep pushing forward." :
                   stats.overallProgress < 75 ? "Amazing work! You're developing serious life skills." : "You're nearly a life skills master! Finish strong!"}
                </p>
              </motion.div>
        </div>

            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Overall Progress - Enhanced with circular progress */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="group p-6 h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-indigo-50/90 via-white to-indigo-100/50 dark:from-indigo-900/30 dark:via-zinc-800/50 dark:to-indigo-800/20 backdrop-blur-sm relative overflow-hidden">
                  {/* Animated border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-sky-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium mb-1">Overall Progress</p>
                        <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.overallProgress}%</p>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium"
                          >
                            {stats.overallProgress >= 75 ? "Expert" : stats.overallProgress >= 50 ? "Advanced" : stats.overallProgress >= 25 ? "Learning" : "Beginner"}
                          </motion.div>
                        </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{stats.completedTasks} of {stats.totalTasks} tasks</p>
              </div>
                      
                      {/* Circular progress indicator */}
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                          {/* Background circle */}
                          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-zinc-200 dark:text-zinc-700" />
                          {/* Progress circle */}
                          <motion.circle 
                            cx="32" 
                            cy="32" 
                            r="28" 
                            stroke="url(#indigo-gradient)" 
                            strokeWidth="6" 
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 28}`}
                            strokeDashoffset={`${2 * Math.PI * 28 * (1 - stats.overallProgress / 100)}`}
                            strokeLinecap="round"
                            initial={{ strokeDashoffset: `${2 * Math.PI * 28}` }}
                            animate={{ strokeDashoffset: `${2 * Math.PI * 28 * (1 - stats.overallProgress / 100)}` }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                          />
                          <defs>
                            <linearGradient id="indigo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="100%" stopColor="#0ea5e9" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Target className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                      </div>
              </div>
            </div>
          </Card>
              </motion.div>

              {/* Time Invested - Enhanced with animated icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="group p-6 h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-100/50 dark:from-emerald-900/30 dark:via-zinc-800/50 dark:to-emerald-800/20 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium mb-1">Time Invested</p>
                        <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{formatTime(stats.totalTimeSpent)}</p>
                          <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                          />
                        </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Learning & growing</p>
              </div>
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/25 transition-shadow duration-300">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        >
                          <Clock className="h-8 w-8 text-white" />
                        </motion.div>
              </div>
                    </div>
                    
                    {/* Time milestone indicator */}
                    <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-2">
                      <motion.div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (stats.totalTimeSpent / 500) * 100)}%` }}
                        transition={{ duration: 1.5, delay: 0.8 }}
                      />
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      {stats.totalTimeSpent >= 500 ? "Time Master! 🏆" : `${500 - stats.totalTimeSpent} mins to Time Master`}
                    </p>
            </div>
          </Card>
              </motion.div>

              {/* Achievements - Enhanced with trophy stack */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="group p-6 h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-amber-50/90 via-white to-amber-100/50 dark:from-amber-900/30 dark:via-zinc-800/50 dark:to-amber-800/20 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium mb-1">Achievements</p>
                        <div className="flex items-center gap-3">
                <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.achievements.length}</p>
                          {/* Achievement tier indicator */}
                          <div className="flex flex-col">
                            {[...Array(Math.min(3, stats.achievements.length))].map((_, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1 + i * 0.1 }}
                                className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 mb-0.5"
                              />
                            ))}
                          </div>
                        </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Badges earned</p>
              </div>
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          }}
                          transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Award className="h-8 w-8 text-white" />
                        </motion.div>
                      </div>
              </div>
            </div>
          </Card>
              </motion.div>

              {/* XP Points - Enhanced with level indicator */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="group p-6 h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0 bg-gradient-to-br from-orange-50/90 via-white to-orange-100/50 dark:from-orange-900/30 dark:via-zinc-800/50 dark:to-orange-800/20 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium mb-1">XP Points</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-zinc-900 dark:text-white">{progress?.totalPoints || 0}</p>
                          <motion.div
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="px-2 py-1 rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/50 dark:to-red-900/50 text-xs font-bold text-orange-700 dark:text-orange-300"
                          >
                            Level {Math.floor((progress?.totalPoints || 0) / 100) + 1}
                          </motion.div>
                        </div>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">Total earned</p>
              </div>
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300 relative">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.2, 1],
                          }}
                          transition={{ 
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Zap className="h-8 w-8 text-white" />
                        </motion.div>
                        {/* Lightning effect */}
                        <motion.div
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/30 to-orange-400/30"
                          animate={{ opacity: [0, 0.8, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                        />
              </div>
                    </div>
                    
                    {/* XP Progress to next level */}
                    <div className="w-full bg-orange-100 dark:bg-orange-900/30 rounded-full h-2">
                      <motion.div 
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${((progress?.totalPoints || 0) % 100)}%` }}
                        transition={{ duration: 1.5, delay: 1 }}
                      />
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                      {100 - ((progress?.totalPoints || 0) % 100)} XP to Level {Math.floor((progress?.totalPoints || 0) / 100) + 2}
                    </p>
            </div>
          </Card>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Enhanced Section Progress */}
        <div className="mb-12">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 dark:from-slate-100 dark:via-indigo-100 dark:to-slate-100 bg-clip-text text-transparent mb-4">
                🎯 Master Life Skills
            </h3>
              <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto">
                Your progress across essential life categories. Each skill builds upon the last!
            </p>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(stats.sectionProgress).map(([category, progress], index) => {
              const Icon = categoryIcons[category];
              const name = categoryNames[category];
              
              // Define category-specific colors and themes
              const categoryConfig = {
                'life-skills': {
                  gradient: 'from-indigo-50/90 via-white to-indigo-100/60 dark:from-indigo-900/40 dark:via-zinc-800/60 dark:to-indigo-800/30',
                  iconGradient: 'from-indigo-500 to-indigo-600',
                  accentColor: 'indigo',
                  progressGradient: 'from-indigo-500 via-indigo-600 to-purple-600',
                  glow: 'group-hover:shadow-indigo-500/25'
                },
                'money-finance': {
                  gradient: 'from-emerald-50/90 via-white to-emerald-100/60 dark:from-emerald-900/40 dark:via-zinc-800/60 dark:to-emerald-800/30',
                  iconGradient: 'from-emerald-500 to-emerald-600',
                  accentColor: 'emerald',
                  progressGradient: 'from-emerald-500 via-emerald-600 to-teal-600',
                  glow: 'group-hover:shadow-emerald-500/25'
                },
                'health': {
                  gradient: 'from-rose-50/90 via-white to-rose-100/60 dark:from-rose-900/40 dark:via-zinc-800/60 dark:to-rose-800/30',
                  iconGradient: 'from-rose-500 to-rose-600',
                  accentColor: 'rose',
                  progressGradient: 'from-rose-500 via-rose-600 to-pink-600',
                  glow: 'group-hover:shadow-rose-500/25'
                },
                'living': {
                  gradient: 'from-purple-50/90 via-white to-purple-100/60 dark:from-purple-900/40 dark:via-zinc-800/60 dark:to-purple-800/30',
                  iconGradient: 'from-purple-500 to-purple-600',
                  accentColor: 'purple',
                  progressGradient: 'from-purple-500 via-purple-600 to-violet-600',
                  glow: 'group-hover:shadow-purple-500/25'
                },
                'career': {
                  gradient: 'from-amber-50/90 via-white to-amber-100/60 dark:from-amber-900/40 dark:via-zinc-800/60 dark:to-amber-800/30',
                  iconGradient: 'from-amber-500 to-amber-600',
                  accentColor: 'amber',
                  progressGradient: 'from-amber-500 via-amber-600 to-orange-600',
                  glow: 'group-hover:shadow-amber-500/25'
                }
              };

              const config = categoryConfig[category];
              
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className={`group relative p-6 h-full hover:shadow-2xl hover:scale-105 transition-all duration-500 cursor-pointer border-0 bg-gradient-to-br ${config.gradient} backdrop-blur-sm overflow-hidden ${config.glow}`}>
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-${config.accentColor}-200/30 to-${config.accentColor}-300/30 dark:from-${config.accentColor}-800/20 dark:to-${config.accentColor}-700/20 rounded-full blur-2xl transform translate-x-16 -translate-y-16`}></div>
                      <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-${config.accentColor}-300/30 to-${config.accentColor}-200/30 dark:from-${config.accentColor}-700/20 dark:to-${config.accentColor}-800/20 rounded-full blur-xl transform -translate-x-12 translate-y-12`}></div>
                    </div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${config.iconGradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                          <Icon className="h-8 w-8 text-white" />
                          {/* Progress ring around icon */}
                          <svg className="absolute inset-0 w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/20" />
                            <motion.circle 
                              cx="32" 
                              cy="32" 
                              r="30" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              fill="transparent"
                              strokeDasharray={`${2 * Math.PI * 30}`}
                              strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress.percentage / 100)}`}
                              strokeLinecap="round"
                              className="text-white"
                              initial={{ strokeDashoffset: `${2 * Math.PI * 30}` }}
                              animate={{ strokeDashoffset: `${2 * Math.PI * 30 * (1 - progress.percentage / 100)}` }}
                              transition={{ duration: 2, ease: "easeOut", delay: index * 0.1 + 0.5 }}
                            />
                          </svg>
                    </div>
                    <div className="flex-1">
                          <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{name}</h4>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{progress.completed}/{progress.total} tasks completed</p>
                    </div>
                  </div>
                  
                      {/* Progress Section */}
                      <div className="space-y-4">
                        {/* Main progress bar */}
                        <div className="space-y-2">
                    <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Progress</span>
                            <motion.span 
                              className="text-2xl font-bold text-zinc-900 dark:text-white"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.1 + 0.8, type: "spring", stiffness: 300 }}
                            >
                              {progress.percentage}%
                            </motion.span>
                    </div>
                    
                          <div className="relative w-full bg-zinc-200/80 dark:bg-zinc-700/80 rounded-full h-4 overflow-hidden">
                            <motion.div 
                              className={`h-4 rounded-full bg-gradient-to-r ${config.progressGradient} shadow-lg relative overflow-hidden`}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress.percentage}%` }}
                              transition={{ duration: 1.5, ease: "easeOut", delay: index * 0.1 + 0.6 }}
                            >
                              {/* Shimmer effect */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: index * 0.2 }}
                                style={{ width: '50%' }}
                              />
                            </motion.div>
                          </div>
                    </div>
                    
                        {/* Stats row */}
                        <div className="flex items-center justify-between pt-2">
                    {progress.timeSpent > 0 && (
                            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Clock className="h-4 w-4" />
                              <span className="font-medium">{formatTime(progress.timeSpent)}</span>
                      </div>
                    )}
                          
                          {/* Completion badge */}
                          {progress.percentage === 100 && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: index * 0.1 + 1, type: "spring", stiffness: 300 }}
                              className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-xs font-bold">MASTERED</span>
                            </motion.div>
                          )}
                          
                          {/* Progress status */}
                          {progress.percentage < 100 && (
                            <div className={`text-xs px-2 py-1 rounded-full bg-${config.accentColor}-100 dark:bg-${config.accentColor}-900/30 text-${config.accentColor}-700 dark:text-${config.accentColor}-300 font-medium`}>
                              {progress.percentage >= 75 ? 'Almost there!' : 
                               progress.percentage >= 50 ? 'Great progress!' : 
                               progress.percentage >= 25 ? 'Getting started!' : 'Just beginning!'}
                            </div>
                          )}
                        </div>

                        {/* Quick action button */}
                        <motion.div
                          className="pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.1 + 1.2 }}
                        >
                          <Link
                            to={`/category/${category}`}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${config.iconGradient} text-white font-medium text-sm hover:shadow-lg transition-all duration-200 group-hover:scale-105`}
                          >
                            <span>
                              {progress.percentage === 100 ? 'Review & Practice' : 'Continue Learning'}
                            </span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </motion.div>
                      </div>
                  </div>
                </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Activity Calendar Section */}
        <div className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityCalendar 
                dailyActivity={progress.dailyActivity || {}} 
                currentStreak={progress.currentStreak || 0} 
              />
            </div>
            <div className="space-y-4">
              {/* Quick Stats */}
              <Card className="p-4">
                <h4 className="font-semibold mb-3 text-sm">This Month</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Tasks completed</span>
                    <span className="font-medium">{Object.values(progress.dailyActivity || {}).reduce((sum, day) => sum + (day.tasks || 0), 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Guides finished</span>
                    <span className="font-medium">{Object.values(progress.dailyActivity || {}).reduce((sum, day) => sum + (day.guides || 0), 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Active days</span>
                    <span className="font-medium">{Object.keys(progress.dailyActivity || {}).length}</span>
                  </div>
                </div>
              </Card>
              
              {/* Streak Info */}
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Current Streak</div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">Keep it going!</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {progress.currentStreak || 0} days
                </div>
              </Card>
            </div>
          </div>
        </div>

                {/* Enhanced Achievement Gallery */}
        <div className="mb-12">
          <div className="mb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-3xl font-bold bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-600 dark:from-amber-400 dark:via-yellow-400 dark:to-amber-400 bg-clip-text text-transparent mb-4">
                🏆 Achievement Gallery
            </h3>
              <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto">
                Every milestone matters! Celebrate your victories and showcase your growth.
            </p>
            </motion.div>
          </div>

          {stats.achievements.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-8"
            >
              {/* Achievement Stats Bar */}
              <div className="bg-gradient-to-r from-amber-50/80 via-white to-yellow-50/80 dark:from-amber-900/30 dark:via-zinc-800/50 dark:to-yellow-900/30 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-zinc-900 dark:text-white">
                        {stats.achievements.length} Achievement{stats.achievements.length !== 1 ? 's' : ''} Unlocked!
                      </h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Earned {stats.achievements.reduce((total, achievement) => total + achievement.points, 0)} bonus XP
                      </p>
                    </div>
                  </div>
                  
                  {/* Achievement tier indicator */}
                  <div className="flex items-center gap-2">
                    {stats.achievements.length >= 10 && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/50 dark:to-indigo-900/50 text-purple-700 dark:text-purple-300 text-sm font-bold"
                      >
                        🌟 Master
                      </motion.div>
                    )}
                    {stats.achievements.length >= 5 && stats.achievements.length < 10 && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 text-blue-700 dark:text-blue-300 text-sm font-bold"
                      >
                        ⚡ Pro
                      </motion.div>
                    )}
                    {stats.achievements.length < 5 && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 text-green-700 dark:text-green-300 text-sm font-bold"
                      >
                        🚀 Rising
                      </motion.div>
                    )}
                  </div>
                </div>
                
                {/* Achievement progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Achievement Progress</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {stats.achievements.length} / {ACHIEVEMENTS.length}
                    </span>
                  </div>
                  <div className="w-full bg-amber-100 dark:bg-amber-900/30 rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="h-3 rounded-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 shadow-sm relative overflow-hidden"
                      initial={{ width: 0 }}
                      animate={{ width: `${(stats.achievements.length / ACHIEVEMENTS.length) * 100}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    >
                      {/* Shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        style={{ width: '50%' }}
                      />
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Achievement Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.achievements.map((achievement, index) => {
                const Icon = achievement.icon;
                return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                    >
                      <Card className="group relative p-6 hover:shadow-2xl hover:scale-105 transition-all duration-500 border-0 bg-gradient-to-br from-amber-50/90 via-white to-yellow-50/60 dark:from-amber-900/40 dark:via-zinc-800/60 dark:to-yellow-900/30 backdrop-blur-sm overflow-hidden">
                        {/* Animated achievement glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                        
                        {/* Golden border accent */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600"></div>
                        
                        {/* Floating particles effect */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {[...Array(3)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                              animate={{
                                y: [0, -20, 0],
                                x: [0, Math.random() * 10 - 5, 0],
                                opacity: [0, 1, 0]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                              }}
                              style={{
                                right: `${i * 8}px`,
                                top: `${i * 4}px`
                              }}
                            />
                          ))}
                      </div>
                        
                        <div className="relative z-10">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow duration-300">
                                <motion.div
                                  animate={{ 
                                    rotate: [0, 10, -10, 0],
                                    scale: [1, 1.05, 1]
                                  }}
                                  transition={{ 
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                >
                                  <Icon className="h-8 w-8 text-white" />
                                </motion.div>
                              </div>
                              {/* Achievement rank indicator */}
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: index * 0.1 + 0.5, type: "spring", stiffness: 300 }}
                                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                              >
                                {index + 1}
                              </motion.div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                                {achievement.title}
                              </h4>
                              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                {achievement.description}
                              </p>
                            </div>
                          </div>
                          
                          {/* XP and date earned */}
                          <div className="flex items-center justify-between pt-3 border-t border-amber-200/50 dark:border-amber-800/50">
                        <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
                                <Zap className="h-3 w-3 text-white" />
                        </div>
                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                                +{achievement.points} XP
                              </span>
                            </div>
                            
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 + 0.8 }}
                              className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-medium"
                            >
                              ✨ Earned!
                            </motion.div>
                      </div>
                    </div>
                  </Card>
                    </motion.div>
                );
              })}
            </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="p-12 text-center border-0 bg-gradient-to-br from-zinc-50/90 via-white to-zinc-100/60 dark:from-zinc-900/40 dark:via-zinc-800/60 dark:to-zinc-700/30 backdrop-blur-sm relative overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-1/4 left-1/4 w-8 h-8 border-2 border-zinc-400 rounded-full"></div>
                  <div className="absolute top-1/3 right-1/3 w-6 h-6 border-2 border-zinc-400 rounded-full"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-10 h-10 border-2 border-zinc-400 rounded-full"></div>
                </div>
                
                <div className="relative z-10">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center mx-auto mb-6 shadow-lg"
                  >
                    <Trophy className="h-12 w-12 text-zinc-500 dark:text-zinc-400" />
                  </motion.div>
                  
                  <h4 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
                    Your first achievement awaits! 🎯
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-400 text-lg mb-6 max-w-md mx-auto">
                    Complete your first task to unlock your achievement gallery and start earning XP bonuses.
                  </p>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-zinc-500 dark:text-zinc-500"
                  >
                    🏅 Ready to earn: "First Steps" achievement (+50 XP)
                  </motion.div>
                </div>
            </Card>
            </motion.div>
          )}

          {/* Next Milestone - Enhanced */}
          {stats.nextMilestone && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8"
            >
              <Card className="p-8 border-0 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/60 dark:from-indigo-900/40 dark:via-zinc-800/60 dark:to-sky-900/30 backdrop-blur-sm relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-200/20 to-sky-200/20 dark:from-indigo-800/10 dark:to-sky-800/10 rounded-full blur-3xl transform translate-x-24 -translate-y-24 group-hover:scale-110 transition-transform duration-700"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg"
                    >
                      <Target className="h-5 w-5 text-white" />
                    </motion.div>
                    <div>
                      <h4 className="text-xl font-bold text-zinc-900 dark:text-white">Next Achievement Goal</h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Keep going to unlock this milestone!</p>
                </div>
              </div>
              
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 relative">
                      <stats.nextMilestone.icon className="h-8 w-8 text-zinc-600 dark:text-zinc-300" />
                      {/* Pulsing lock indicator */}
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-400 dark:bg-zinc-500 flex items-center justify-center"
                      >
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </motion.div>
                </div>
                    
                <div className="flex-1">
                      <h5 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">
                        {stats.nextMilestone.title}
                      </h5>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                        {stats.nextMilestone.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
                            <Zap className="h-3 w-3 text-white" />
                  </div>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            +{stats.nextMilestone.points} XP when earned
                          </span>
                        </div>
                        
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-xs px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-medium"
                        >
                          🎯 Coming Soon
                        </motion.div>
                      </div>
                    </div>
                </div>
              </div>
            </Card>
            </motion.div>
          )}
        </div>

        {/* Financial Benchmarking Section */}
        <div className="mb-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              Financial Benchmark vs Peers
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              See how your finances compare to others in your age group
            </p>
          </div>

          {!hasAssessment ? (
            <Card className="p-8 text-center border-0 bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Complete Financial Assessment</h4>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Share your financial information to see how you compare to your peers and get personalized insights
              </p>
              <Button
                onClick={() => setShowFinancialAssessment(true)}
                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                icon={BarChart3}
              >
                Start Assessment
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const comparison = getFinancialComparison();
                if (!comparison) return null;

                return Object.entries(comparison).filter(([key]) => key !== 'ageGroup').map(([key, data]) => (
                  <Card key={key} className="p-6 border-0 bg-gradient-to-br from-white/80 to-zinc-50/80 dark:from-zinc-900/80 dark:to-zinc-800/80">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-zinc-900 dark:text-white">{data.label}</h4>
                      <div className={`text-2xl font-bold ${getPercentileColor(data.percentile)}`}>
                        {data.percentile ? `${data.percentile}%` : 'N/A'}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Your Amount:</span>
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {key === 'creditScore' ? (data.value || 'No Credit') : formatCurrency(data.value)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">Peer Average:</span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          {key === 'creditScore' ? data.benchmark.percentiles[50] : formatCurrency(data.benchmark.percentiles[50])}
                        </span>
                      </div>

                      {data.percentile && (
                        <div className="pt-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">Ranking:</span>
                            <span className={`text-xs font-medium ${getPercentileColor(data.percentile)}`}>
                              {getPercentileLabel(data.percentile)}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-200 rounded-full h-2 dark:bg-zinc-700">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                data.percentile >= 75 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                data.percentile >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                data.percentile >= 25 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                                'bg-gradient-to-r from-red-500 to-red-600'
                              }`}
                              style={{ width: `${data.percentile}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ));
              })()}
            </div>
          )}

          {hasAssessment && (
            <div className="mt-4 text-center">
              <Button
                onClick={() => setShowFinancialAssessment(true)}
                className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                icon={Settings}
              >
                Update Financial Info
              </Button>
            </div>
          )}
        </div>

        {/* Profile Management & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <Card className="border-0 bg-gradient-to-br from-zinc-50/80 to-zinc-100/50 dark:from-zinc-900/20 dark:to-zinc-800/20">
            <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-700/50">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-zinc-900 dark:text-white">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-white" />
                </div>
                Profile Settings
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <Link to="/settings" className="group block">
                <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-zinc-800/70 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 hover:bg-white dark:hover:bg-zinc-800/90 transition-all duration-200 hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">Edit Profile Information</span>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Update your name, email, and password</p>
                  </div>
                </div>
              </Link>
              
              <div className="flex items-center gap-3 p-4 bg-white/70 dark:bg-zinc-800/70 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-zinc-900 dark:text-white">Theme Preference</span>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Currently using {theme === 'dark' ? 'Dark' : 'Light'} mode</p>
                </div>
                <button 
                  onClick={toggle} 
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>

              <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-sky-50/80 dark:from-indigo-900/20 dark:to-sky-900/20 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center">
                    <Download className="h-3 w-3 text-white" />
                </div>
                  <span className="font-medium text-indigo-900 dark:text-indigo-200">Export Progress</span>
                </div>
                <p className="text-sm text-indigo-800 dark:text-indigo-300 mb-3">Download your achievement data and progress summary</p>
                <button className="text-sm bg-gradient-to-r from-indigo-500 to-sky-500 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-sky-600 transition-all duration-200 shadow-md">
                  Download Report
                </button>
              </div>
            </div>
          </Card>

          {/* Quick Learning Actions */}
          <Card className="border-0 bg-gradient-to-br from-zinc-50/80 to-zinc-100/50 dark:from-zinc-900/20 dark:to-zinc-800/20">
            <div className="p-6 border-b border-zinc-200/50 dark:border-zinc-700/50">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-zinc-900 dark:text-white">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                Continue Learning
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <Link to="/category/life-skills" className="group block">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-indigo-50/80 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50 hover:from-indigo-100 hover:to-indigo-200/50 dark:hover:from-indigo-900/30 dark:hover:to-indigo-800/30 transition-all duration-200 hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white group-hover:text-indigo-600 transition-colors">Life Skills</span>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{stats.sectionProgress['life-skills']?.percentage}% complete</p>
                  </div>
                </div>
              </Link>
              
              <Link to="/category/money-finance" className="group block">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 hover:from-emerald-100 hover:to-emerald-200/50 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30 transition-all duration-200 hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white group-hover:text-emerald-600 transition-colors">Money & Finance</span>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{stats.sectionProgress['money-finance']?.percentage}% complete</p>
                  </div>
                </div>
              </Link>

              <Link to="/category/health" className="group block">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-rose-50/80 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/20 rounded-xl border border-rose-200/50 dark:border-rose-700/50 hover:from-rose-100 hover:to-rose-200/50 dark:hover:from-rose-900/30 dark:hover:to-rose-800/30 transition-all duration-200 hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                    <Stethoscope className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white group-hover:text-rose-600 transition-colors">Health & Wellness</span>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{stats.sectionProgress['health']?.percentage}% complete</p>
                  </div>
                </div>
              </Link>

              <Link to="/category/living" className="group block">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50/80 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50 hover:from-purple-100 hover:to-purple-200/50 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30 transition-all duration-200 hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Home className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white group-hover:text-purple-600 transition-colors">Living on Your Own</span>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{stats.sectionProgress['living']?.percentage}% complete</p>
                  </div>
                </div>
              </Link>

              <Link to="/category/career" className="group block">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl border border-amber-200/50 dark:border-amber-700/50 hover:from-amber-100 hover:to-amber-200/50 dark:hover:from-amber-900/30 dark:hover:to-amber-800/30 transition-all duration-200 hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white group-hover:text-amber-600 transition-colors">Work & Career</span>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{stats.sectionProgress['career']?.percentage}% complete</p>
                  </div>
                </div>
              </Link>
            </div>
          </Card>
        </div>

      </Container>

      {/* Financial Assessment Modal */}
      {showFinancialAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-xl">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Financial Assessment</h3>
                <button
                  onClick={() => setShowFinancialAssessment(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                Share your financial information to see how you compare to your peers. Your data is stored locally and private.
              </p>
            </div>

            <form onSubmit={handleFinancialSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    min="16"
                    max="30"
                    value={assessmentData.age}
                    onChange={(e) => setAssessmentData({ ...assessmentData, age: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Annual Income
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assessmentData.income}
                    onChange={(e) => setAssessmentData({ ...assessmentData, income: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                    placeholder="e.g., 45000"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Before taxes, including all sources</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Total Savings
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assessmentData.savings}
                    onChange={(e) => setAssessmentData({ ...assessmentData, savings: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                    placeholder="e.g., 5000"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">All savings accounts combined</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Checking Account Balance
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assessmentData.checking}
                    onChange={(e) => setAssessmentData({ ...assessmentData, checking: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                    placeholder="e.g., 2000"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Current checking account balance</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Credit Score
                  </label>
                  <input
                    type="number"
                    min="300"
                    max="850"
                    value={assessmentData.creditScore}
                    onChange={(e) => setAssessmentData({ ...assessmentData, creditScore: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                    placeholder="e.g., 720"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Leave blank if you don't have credit history</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Total Debt
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assessmentData.debt}
                    onChange={(e) => setAssessmentData({ ...assessmentData, debt: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                    placeholder="e.g., 15000"
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Student loans, credit cards, auto loans, etc.</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  onClick={() => setShowFinancialAssessment(false)}
                  className="rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                  icon={BarChart3}
                >
                  Get My Financial Ranking
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------
// Main App with Router
// -----------------------------
export default function GrowUpApp() {
  console.log('GrowUpApp rendered');
  return (
    <AuthProvider>
      <PlansProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedHomePage />} />
          <Route path="/reset" element={<PasswordResetPage />} />
          <Route path="/guide/:slug" element={<ProtectedRoute><GuideDetailPage /></ProtectedRoute>} />
          <Route path="/plan" element={<ProtectedRoute><YourPlanPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/category/:categoryKey" element={<ProtectedRoute><CategoryPage /></ProtectedRoute>} />
          <Route path="/search/:query" element={<ProtectedRoute><SearchResults /></ProtectedRoute>} />
          <Route path="*" element={<div>Route not found</div>} />
        </Routes>
      </Router>
      </PlansProvider>
    </AuthProvider>
  );
}
