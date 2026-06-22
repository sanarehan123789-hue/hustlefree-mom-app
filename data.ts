import { MomProfile, Chore, BudgetLog, TimeBlock } from './types';

export const PROFILE_DETAILS = {
  housewife: {
    title: "Housewife Mode",
    subtitle: "Focus: Daily micro-chores, family calendar & active meal/budget tracking",
    themeColor: "from-pink-500/10 to-rose-500/10 border-rose-200 text-rose-700",
    accent: "rose",
    defaultTips: [
      "Group your grocery list by supermarket aisle to cut shopping time in half.",
      "Prep tomorrow's lunchboxes and lay out clothes the night before to defuse morning chaos.",
      "Keep a 'micro-cleaning' spray bottle in the bathroom to wipe counters in under 30 seconds."
    ],
    categories: ["Groceries", "Household Supply", "Seasonal / Gifts", "Kids Activities", "Medical / Healthcare"]
  },
  working: {
    title: "Working Mom Mode",
    subtitle: "Focus: Commute buffers, strict transition alarms & quick-win chore sprints",
    themeColor: "from-indigo-500/10 to-blue-500/10 border-blue-200 text-blue-700",
    accent: "blue",
    defaultTips: [
      "Set a strict 'Evening Transition Alarm' 15 minutes before leaving the office to decompress.",
      "Gamify chores: set a 15-minute timer and compete with yourself to complete 3 quick-win chores.",
      "Sync digital calendars with school trackers to avoid missing event sign-up deadlines."
    ],
    categories: ["Childcare & School", "Commuting & Gas", "Convenience Meals", "Professional Development", "Office Wardrobe"]
  },
  remote: {
    title: "Remote Working Mom Mode",
    subtitle: "Focus: Professional focus hours, passive chore laundry breaks & work-from-home overhead",
    themeColor: "from-emerald-500/10 to-teal-500/10 border-teal-200 text-teal-700",
    accent: "teal",
    defaultTips: [
      "Create a physical border: close your laptop or shut your home office door to separate work from family time.",
      "Combine screen breaks with passive chores (such as checking laundry or airing out rooms).",
      "Draft a strict utility log to offset work-from-home overhead from your household tax sheets."
    ],
    categories: ["Office Supplies", "Internet & Utilities", "Home Workspace Upgrade", "Snacks & Coffeebar", "Work Commute Travel"]
  }
};

export const getDefaultChores = (userId: string, profile: MomProfile): Omit<Chore, 'id' | 'createdAt'>[] => {
  if (profile === 'housewife') {
    return [
      { userId, title: "Wipe down kitchen countertops", type: "tiny", completed: false, profile },
      { userId, title: "Water indoor and balcony plants", type: "tiny", completed: false, profile },
      { userId, title: "Quick-vacuum heavy traffic areas", type: "tiny", completed: false, profile },
      { userId, title: "Sort children's wardrobes for seasonal swap", type: "deep", completed: false, profile },
      { userId, title: "Deep clean freezer and meal-prep containers", type: "deep", completed: false, profile },
      { userId, title: "Audit monthly pantry supplies and stock staples", type: "deep", completed: false, profile },
    ];
  } else if (profile === 'working') {
    return [
      { userId, title: "Unpack school backpacks and file permission slips", type: "tiny", completed: false, profile },
      { userId, title: "Lay out outfits for the next morning", type: "tiny", completed: false, profile },
      { userId, title: "Speed-tidy toys (15-min family speed-run)", type: "tiny", completed: false, profile },
      { userId, title: "Sunday meal batch-cooking (3-4 weekday dinner bases)", type: "deep", completed: false, profile },
      { userId, title: "Disinfect active backpacks, lunchbags, and keys", type: "deep", completed: false, profile },
      { userId, title: "Deep-wash and prep commuting vehicle interior", type: "deep", completed: false, profile },
    ];
  } else {
    return [
      { userId, title: "Load washing machine (passive chore break)", type: "tiny", completed: false, profile },
      { userId, title: "Tidy physical workspace desk of post-its and clutter", type: "tiny", completed: false, profile },
      { userId, title: "Stretch and refill water bottle", type: "tiny", completed: false, profile },
      { userId, title: "Organize digital filing cabinet & cloud drives", type: "deep", completed: false, profile },
      { userId, title: "Thorough deep-clean of home-office utility tech", type: "deep", completed: false, profile },
      { userId, title: "Wipe down all shared screens and cables", type: "deep", completed: false, profile },
    ];
  }
};

export const getDefaultRoutines = (userId: string, profile: MomProfile): Omit<TimeBlock, 'id'>[] => {
  if (profile === 'housewife') {
    return [
      { userId, time: "07:00 AM - 08:30 AM", activity: "Morning family prep & breakfast table chat", profile, isCompleted: false },
      { userId, time: "09:00 AM - 10:30 AM", activity: "Meal planning & grocery organization", profile, isCompleted: false },
      { userId, time: "11:00 AM - 12:30 PM", activity: "Micro-chores routine & general tidying", profile, isCompleted: false },
      { userId, time: "02:30 PM - 04:30 PM", activity: "Pantry audit & homework prep", profile, isCompleted: false },
      { userId, time: "08:30 PM - 09:30 PM", activity: "Winddown bath & self-care journaling", profile, isCompleted: false },
    ];
  } else if (profile === 'working') {
    return [
      { userId, time: "07:30 AM - 08:30 AM", activity: "Commute buffer: calming audio & podcast", profile, isCompleted: false },
      { userId, time: "09:00 AM - 12:00 PM", activity: "Morning high-priority business desk duty", profile, isCompleted: false },
      { userId, time: "05:00 PM - 05:30 PM", activity: "Evening transition buffer: commute winddown", profile, isCompleted: false },
      { userId, time: "06:00 PM - 06:15 PM", activity: "Quick-win 15-minute cleaning blitz", profile, isCompleted: false },
      { userId, time: "08:30 PM - 09:15 PM", activity: "Lay out clothes & prep next day bags", profile, isCompleted: false },
    ];
  } else {
    return [
      { userId, time: "08:00 AM - 08:30 AM", activity: "Commute simulation: morning neighborhood walk", profile, isCompleted: false },
      { userId, time: "09:00 AM - 11:30 AM", activity: "Deep professional focus (Slack paused)", profile, isCompleted: false },
      { userId, time: "11:45 AM - 12:15 PM", activity: "Lunch & passive laundry break swap", profile, isCompleted: false },
      { userId, time: "01:30 PM - 04:00 PM", activity: "Co-working slots & admin tasks", profile, isCompleted: false },
      { userId, time: "05:00 PM - 05:15 PM", activity: "Laptop lid closure & physical boundary walk", profile, isCompleted: false },
    ];
  }
};
