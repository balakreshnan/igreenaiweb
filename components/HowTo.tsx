"use client";

import { useState } from "react";

type Destination = "register" | "login" | "dashboard";
type Step = { title: string; body: string; tip: string; fields: [string, string][] };
type Tutorial = { id: string; title: string; description: string; time: string; destination: Destination; steps: Step[] };

const tutorials: Tutorial[] = [
  {
    id: "account", title: "Create your account", description: "Set up your personal or organization profile.", time: "2 min", destination: "register",
    steps: [
      { title: "Choose how you participate", body: "Select Join the movement on the homepage. Enter your full name and choose Personal, Business, or Corporate. City or region is optional; Business and Corporate profiles can also include an organization.", tip: "Choose the account type that best describes your participation. Organization is optional.", fields: [["Full name", "Alex Morgan"], ["I'm joining as", "Business"], ["Organization · optional", "Evergreen Studio"]] },
      { title: "Set your login details", body: "Enter your email address and create a password with at least eight characters. Your email is the identifier you will use each time you sign in.", tip: "Already registered? Use Sign in with your existing email instead of creating another account.", fields: [["Email address", "alex@example.com"], ["Password", "At least 8 characters"]] },
      { title: "Open your impact space", body: "Select Create my impact space. After successful registration, the site signs you in and opens your dashboard. You can start with a goal assessment or log your first action.", tip: "Your new dashboard starts with no activity. Totals grow as you record actions.", fields: [["Select", "Create my impact space"], ["Next screen", "Your impact space"]] },
    ],
  },
  {
    id: "login", title: "Sign in with confidence", description: "Access your dashboard and finish your session.", time: "1 min", destination: "login",
    steps: [
      { title: "Find member sign in", body: "Select Sign in in the navigation or Member sign in in the footer. On a phone, open the menu first. Member accounts use an email address; Admin access is for authorized administrators.", tip: "If your session is still active, the dashboard may open automatically.", fields: [["Navigation", "Sign in"], ["Member login", "Email address + password"]] },
      { title: "Enter your credentials", body: "Use the email address and password you registered with, then select Sign in. Wait while the form shows One moment…. Successful sign-in opens your dashboard.", tip: "If the email or password is incorrect, check both and try again. There is no self-service password reset yet; contact the site owner if you need help.", fields: [["Email address", "alex@example.com"], ["Password", "Your registered password"], ["Select", "Sign in"]] },
      { title: "Navigate and sign out", body: "Select My impact to return to your dashboard after visiting the homepage. When finished, select Sign out in the navigation; the site returns to the homepage.", tip: "Sign out when using a shared computer. Your activity remains saved in your account.", fields: [["Return to dashboard", "My impact"], ["End your session", "Sign out"]] },
    ],
  },
  {
    id: "goals", title: "Build an action plan", description: "Turn six answers into practical recommendations.", time: "2 min", destination: "dashboard",
    steps: [
      { title: "Start your assessment", body: "On your dashboard, select Assess my goals. Choose the answer that best matches your priorities, then select Next question.", tip: "Answer for your current situation. The plan should fit your time and resources.", fields: [["Select", "Assess my goals"], ["Example priority", "Saving money"]] },
      { title: "Answer all six questions", body: "Continue through your priorities, pace, setting, transport, meals, and barriers. Choose one answer for each question. Use Previous to review an earlier choice.", tip: "You must select an answer before you can continue to the next question.", fields: [["Example pace", "Build momentum"], ["Example setting", "At work"], ["Example barrier", "Time"]] },
      { title: "Put recommendations to work", body: "Select Create my action plan on the final question. Read the recommendations, effort, and frequency on your dashboard. Use Retake assessment whenever your circumstances change.", tip: "Recommendations do not automatically record actions or create schedules. Log the actions you take separately.", fields: [["Select", "Create my action plan"], ["Dashboard section", "Recommended for your goals"]] },
    ],
  },
  {
    id: "action", title: "Record your first action", description: "Capture an everyday choice and see its estimated impact.", time: "2 min", destination: "dashboard",
    steps: [
      { title: "Choose the impact area", body: "Select Log an action on your dashboard. Choose Low-carbon travel, Clean energy, Planet-friendly food, Circular living, or Water stewardship. Describe what you actually did.", tip: "Replace the suggested description with something specific, such as Cycled instead of driving.", fields: [["Impact area", "Low-carbon travel"], ["What did you do?", "Cycled instead of driving"]] },
      { title: "Enter the amount and date", body: "Use the unit displayed in Measured in. Travel uses kilometers avoided, energy uses kWh saved, food uses plant-based meals, waste uses kilograms diverted, and water uses liters saved. Choose the activity date and optionally add a note.", tip: "For manual entries, Amount accepts 0.01 to 100,000. A five-kilometer travel swap uses an amount of 5.", fields: [["Amount", "5"], ["Measured in", "km avoided"], ["Date", "The day you took the action"]] },
      { title: "Save and review your progress", body: "Select Save this action. Look for the entry under Recent actions and review your updated Estimated impact and Actions logged. Impact by area shows your all-time category totals.", tip: "CO₂e means carbon dioxide equivalent. These figures are directional estimates, not audited carbon accounting. Matching date, category, description, and quantity entries are saved only once.", fields: [["Select", "Save this action"], ["Example estimated impact", "About 1.1 kg CO₂e for 5 km"], ["Review", "Recent actions"]] },
    ],
  },
  {
    id: "schedule", title: "Schedule a routine", description: "Make repeated activities easier to maintain.", time: "2 min", destination: "dashboard",
    steps: [
      { title: "Describe your recurring action", body: "Under Recurring schedules, select New schedule. Choose an impact area, describe the routine, and enter the amount for each occurrence in that category's unit.", tip: "Use schedules for routines you expect to repeat. Due entries are recorded automatically.", fields: [["What will you do?", "Cycle to the office"], ["Impact area", "Low-carbon travel"], ["Amount per occurrence", "5 km avoided"]] },
      { title: "Set frequency and start date", body: "Choose Daily, Weekly, or Monthly. Set Starts on to today or a future date, add an optional note, then select Create schedule.", tip: "Check the amount and frequency carefully: the same amount is used for each scheduled occurrence.", fields: [["Frequency", "Weekly"], ["Starts on", "Today or a future date"], ["Select", "Create schedule"]] },
      { title: "Keep the routine accurate", body: "Review its status and next date in Activity schedules. Use the pause icon when the routine stops, the play icon to resume, or the trash icon to remove it. Previously logged activities remain after removal.", tip: "Due entries can appear after processing. Opening your dashboard also reconciles due activity. Matching records are skipped.", fields: [["Pause icon", "Pause schedule"], ["Play icon", "Resume schedule"], ["Trash icon", "Remove schedule"]] },
    ],
  },
  {
    id: "upload", title: "Upload from Excel", description: "Bring multiple activity records into your account.", time: "3 min", destination: "dashboard",
    steps: [
      { title: "Start with the guided workbook", body: "Select Upload workbook under Excel bulk upload, then Download the sample workbook. Read the instructions and enter your own records in the Activities worksheet starting at row 8.", tip: "Keep the Activities worksheet name and row 7 headers unchanged. Use rows 8–507 for up to 500 activities.", fields: [["Worksheet", "Activities"], ["Headers", "Date · Category · Activity · Quantity · Note"], ["First activity row", "8"]] },
      { title: "Use consistent values", body: "Use Excel dates or YYYY-MM-DD text. Category must be transport, energy, food, waste, or water. Add a description and a positive quantity in the category's unit, no greater than 100,000. Note is optional.", tip: "Save as .xlsx with a file size of 5 MB or smaller. Rows beyond 507 are not read.", fields: [["Example date", "2026-10-04"], ["Category", "transport"], ["Activity / quantity", "Cycled instead of driving / 5"]] },
      { title: "Upload and check the results", body: "Choose your completed workbook and select Upload activities. Review activities added, duplicates skipped, and invalid rows skipped. Close the upload window to see updated dashboard totals.", tip: "Correct invalid records before uploading again. Matching entries already imported are skipped, including duplicates of manual or scheduled activities.", fields: [["Select", "Upload activities"], ["Review counts", "Added · Duplicates skipped · Invalid rows skipped"]] },
    ],
  },
  {
    id: "export", title: "Review and export records", description: "Take your activity history into your next report.", time: "1 min", destination: "dashboard",
    steps: [
      { title: "Review your dashboard", body: "Use Estimated impact, Actions logged, and Impact by area to understand your progress. Recent actions displays up to eight entries with dates and estimated impact.", tip: "The dashboard summarizes your own account. Business and Corporate account types use the same member tools.", fields: [["Summary", "Estimated impact + Actions logged"], ["Category chart", "All time"], ["Recent list", "Up to 8 actions"]] },
      { title: "Download your full history", body: "Select Export CSV beside Recent actions. The download includes all your recorded activities, not just the eight shown on screen. Export becomes available once you have at least one action.", tip: "You must be signed in to export your records.", fields: [["Select", "Export CSV"], ["Download", "All your activity records"]] },
      { title: "Use your records thoughtfully", body: "Open the CSV in Excel or another spreadsheet tool. Review dates, categories, activity descriptions, quantities, units, estimated impact, and notes before sharing it with colleagues.", tip: "Profiles are not public. Authorized administrators can view registration details and participation summaries. Share exports only with your intended recipients.", fields: [["Open with", "Excel or another spreadsheet tool"], ["Reporting context", "Directional impact estimates"]] },
    ],
  },
];

export default function HowTo({ signedIn, onNavigate }: { signedIn: boolean; onNavigate: (destination: Destination) => void }) {
  const [topic, setTopic] = useState(0);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const tutorial = tutorials[topic];
  const current = tutorial.steps[step];
  const isComplete = completed.includes(tutorial.id);
  const destination = signedIn ? "dashboard" : tutorial.destination === "dashboard" ? "login" : tutorial.destination;

  return <main className="howto-page">
    <div className="container">
      <header className="howto-heading">
        <div><span className="kicker">THE IGREEN.AI LEARNING CENTER</span><h1>A clear path from<br/><em>intention to action.</em></h1><p>Learn the essentials at your own pace. Choose a tutorial, walk through each step, then put it into practice in your impact space.</p></div>
        <div className="learning-summary"><span className="learning-summary-icon">↗</span><strong>{completed.length}<span> / {tutorials.length}</span></strong><p>Tutorials completed</p><small>Progress for this visit</small></div>
      </header>

      <div className="learning-workspace">
        <aside className="tutorial-sidebar" aria-label="Choose a tutorial">
          <span className="kicker">HOW TO</span>
          {tutorials.map((item, index) => <button key={item.id} className={`tutorial-topic ${topic === index ? "selected" : ""}`} aria-pressed={topic === index} onClick={() => { setTopic(index); setStep(0); }}><span className="topic-number">{completed.includes(item.id) ? "✓" : String(index + 1).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.time} · {item.steps.length} steps{completed.includes(item.id) ? " · Complete" : ""}</small></span><span aria-hidden="true">›</span></button>)}
          <p className="tutorial-sidebar-note">No account needed to learn.<br/>Sign in when you’re ready to practice.</p>
        </aside>

        <section className="tutorial-panel" aria-label={tutorial.title}>
          <div className="tutorial-intro"><div><span className="kicker">GUIDED TUTORIAL · {tutorial.time.toUpperCase()}</span><h2>{tutorial.title}</h2><p>{tutorial.description}</p></div><span className="tutorial-count">{step + 1} / {tutorial.steps.length}</span></div>
          <div className="tutorial-progress" role="progressbar" aria-label="Position in tutorial" aria-valuemin={1} aria-valuemax={tutorial.steps.length} aria-valuenow={step + 1}><span style={{ width: `${(step + 1) / tutorial.steps.length * 100}%` }}/></div>
          <nav className="tutorial-step-nav" aria-label="Tutorial steps">{tutorial.steps.map((item, index) => <button key={item.title} aria-current={step === index ? "step" : undefined} onClick={() => setStep(index)}><span>{index + 1}</span><span>{item.title}</span></button>)}</nav>

          <div className="tutorial-step-content" aria-live="polite" aria-atomic="true">
            <div className="tutorial-instruction"><span className="kicker">STEP {String(step + 1).padStart(2, "0")}</span><h3>{current.title}</h3><p>{current.body}</p><div className="tutorial-tip"><strong>A useful detail</strong><p>{current.tip}</p></div></div>
            <div className="tutorial-preview"><div className="preview-heading"><span className="preview-dots" aria-hidden="true">● ● ●</span><span>EXAMPLE PREVIEW</span></div><div className="preview-body"><span className="preview-brand">igreen<span>.ai</span></span>{current.fields.map(([label, value]) => <div className="preview-field" key={label}><span>{label}</span><strong>{value}</strong></div>)}<small>Illustration only. Your account is updated when you use the actual site tools.</small></div></div>
          </div>

          <div className="tutorial-controls"><button className="button button-outline" disabled={step === 0} onClick={() => setStep(step - 1)}>← Previous</button><span>Step {step + 1} of {tutorial.steps.length}</span>{step < tutorial.steps.length - 1 ? <button className="button button-primary" onClick={() => setStep(step + 1)}>Next step →</button> : <button className="button button-primary" disabled={isComplete} onClick={() => setCompleted([...completed, tutorial.id])}>{isComplete ? "Completed ✓" : "Mark tutorial complete ✓"}</button>}</div>
          {isComplete && <div className="tutorial-completion" role="status"><span aria-hidden="true">✓</span><div><strong>Ready to put this into practice.</strong><p>You’ve completed this guide. Revisit any step whenever you need a reminder.</p></div><button className="button button-dark" onClick={() => onNavigate(destination)}>{signedIn ? "Open my dashboard" : destination === "register" ? "Create an account" : "Sign in to practice"} →</button></div>}
        </section>
      </div>

      <section className="learning-faq" aria-labelledby="learning-faq-title"><div><span className="kicker">A LITTLE EXTRA GUIDANCE</span><h2 id="learning-faq-title">Common questions,<br/>clear answers.</h2><p>Helpful details before you get started.</p></div><div>
        <details><summary>What if I forget my password?</summary><p>The current site does not have a self-service password reset. Contact the site owner for assistance. If you see “Email or password is incorrect,” first check your registered email and password.</p></details>
        <details><summary>Can my organization use these tools?</summary><p>Yes. Choose Business or Corporate during registration and optionally add your organization. Your account has the same activity, assessment, schedule, upload, and export tools as other member accounts.</p></details>
        <details><summary>Why was an activity skipped?</summary><p>Entries with matching account, date, category, activity description, and quantity are stored once. Excel uploads report duplicate and invalid row counts; check required values before uploading corrected records.</p></details>
        <details><summary>How should I interpret the impact figures?</summary><p>CO₂e means carbon dioxide equivalent. The site uses simple category factors to estimate impact. Use the figures to track participation and progress; they are not audited greenhouse-gas accounting.</p></details>
      </div></section>
    </div>
  </main>;
}
