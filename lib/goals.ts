import type { AccountType, GoalAnswers, GoalRecommendation } from "./types";

const recommendations: Record<string, GoalRecommendation> = {
  commute: { id: "commute-swap", category: "transport", title: "Swap one car journey", description: "Choose walking, cycling, transit, carpooling, or trip combining for one routine journey.", why: "A repeatable travel swap can reduce emissions and transportation costs.", effort: "Build a habit", frequency: "Once each week" },
  efficientDriving: { id: "drive-smart", category: "transport", title: "Make necessary drives lighter", description: "Combine errands, keep tires properly inflated, and avoid unnecessary idling.", why: "You can reduce fuel use without changing every journey at once.", effort: "Quick win", frequency: "On every drive" },
  plantMeal: { id: "plant-first", category: "food", title: "Add a plant-first meal", description: "Replace one meat-centered meal with beans, lentils, vegetables, or another plant-forward favorite.", why: "A manageable meal change builds confidence without requiring an all-or-nothing diet.", effort: "Build a habit", frequency: "Twice each week" },
  foodWaste: { id: "food-waste", category: "waste", title: "Plan a use-it-up meal", description: "Choose one weekly meal that uses ingredients already open or nearing their use-by date.", why: "Preventing food waste can lower both household emissions and grocery spending.", effort: "Quick win", frequency: "Once each week" },
  renterEnergy: { id: "renter-energy", category: "energy", title: "Create a low-energy routine", description: "Adjust the thermostat, switch off idle devices, wash cold, and use LED lighting where practical.", why: "These renter-friendly actions need no renovation and can reduce utility use.", effort: "Quick win", frequency: "Daily" },
  homeAudit: { id: "home-audit", category: "energy", title: "Find your home’s energy leaks", description: "Review insulation, drafts, heating settings, and available utility energy-audit programs.", why: "Knowing where energy escapes helps you prioritize upgrades with the best return.", effort: "Build a habit", frequency: "This month" },
  water: { id: "water-reset", category: "water", title: "Run a five-minute water check", description: "Check for leaks, shorten one routine, and only run full dishwasher or laundry loads.", why: "A simple check can uncover waste without adding much time to your week.", effort: "Quick win", frequency: "This week" },
  team: { id: "green-team", category: "community", title: "Start a small green team", description: "Invite two colleagues or friends to choose one shared action and compare progress monthly.", why: "Visible peer support makes sustainable habits easier to maintain and spread.", effort: "Lead change", frequency: "Monthly" },
  baseline: { id: "workplace-baseline", category: "energy", title: "Measure one workplace baseline", description: "Choose electricity, travel, purchasing, or waste and record one month of current activity.", why: "A simple baseline turns broad ambition into a decision your organization can act on.", effort: "Lead change", frequency: "Over the next 30 days" },
  share: { id: "share-progress", category: "community", title: "Invite someone into your goal", description: "Tell one person what you are trying and invite them to join or check in with you.", why: "Support and shared accountability help good intentions become lasting habits.", effort: "Quick win", frequency: "This week" },
};

export function recommendGoals(answers: GoalAnswers, accountType: AccountType): GoalRecommendation[] {
  const picks: GoalRecommendation[] = [];
  const add = (key: keyof typeof recommendations) => {
    if (!picks.some((item) => item.id === recommendations[key].id)) picks.push(recommendations[key]);
  };

  if (answers.transport === "car" || answers.transport === "mixed") add("commute");
  if (answers.transport === "car" && answers.barrier === "time") add("efficientDriving");
  if (answers.food === "omnivore" || answers.food === "flexitarian") add("plantMeal");
  else add("foodWaste");
  if (answers.setting === "rent") add("renterEnergy");
  if (answers.setting === "own") add("homeAudit");
  if (answers.setting === "workplace" || accountType !== "personal") add("baseline");
  if (answers.focus === "community" || answers.barrier === "support") add("share");
  if (answers.pace === "leader" || accountType === "corporate") add("team");
  if (answers.focus === "cost" && picks.length < 4) add("foodWaste");
  if (answers.focus === "wellbeing" && picks.length < 4) add("water");
  if (picks.length < 3) add("water");
  if (picks.length < 3) add("share");

  const limit = answers.pace === "starter" ? 3 : answers.pace === "steady" ? 4 : 5;
  return picks.slice(0, limit);
}
