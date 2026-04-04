const fs = require("fs");
const path = require("path");
const { loadEnvConfig } = require("@next/env");
const admin = require("firebase-admin");

const EXISTING_MANTIS_COURSE_ID = "ODAQN0LrgapbAdACrugT";

/** Built from live https://home.withmantis.com/ head styles + splash markup (no 3D island, no GitHub corner, no CTAs). */
function loadMantisHeroEmbedHtml() {
  return fs.readFileSync(path.join(__dirname, "mantis_hero_embed_document.html"), "utf8");
}

function initAdmin() {
  loadEnvConfig(process.cwd());
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  return admin.firestore();
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const [key, value] = raw.slice(2).split("=");
    args[key] = value || "true";
  }
  return args;
}

async function resolveOwnerId(db, explicitOwnerId) {
  if (explicitOwnerId) return explicitOwnerId;
  const existingCourseSnap = await db.collection("courses").doc(EXISTING_MANTIS_COURSE_ID).get();
  if (!existingCourseSnap.exists) {
    throw new Error("Could not infer ownerId. Pass --owner-id=<firebase uid>.");
  }
  const ownerId = existingCourseSnap.data()?.ownerId;
  if (!ownerId) {
    throw new Error("Existing Mantis course has no ownerId. Pass --owner-id=<firebase uid>.");
  }
  return ownerId;
}

function buildMissionHierarchy(projectTitle, missionNote) {
  return {
    title: projectTitle,
    children: [
      {
        type: "subcontent",
        content: {
          title: "Mission",
          children: missionNote ? [{ type: "text", text: missionNote }] : [],
        },
      },
    ],
  };
}

function buildLesson({
  title,
  description,
  guide,
  tutorConfig,
  missionNote,
  starterMessage,
  cardsToUnlock,
  quiz,
}) {
  return {
    title,
    description,
    content: guide,
    guide: { body: guide },
    tutorConfig,
    resources: [],
    baseProjectTemplate: {
      title,
      hierarchy: buildMissionHierarchy(title, missionNote),
      messages: starterMessage ? [{ content: starterMessage, isResponse: true }] : [],
      shareWithOwner: false,
      shareWithStaff: false,
    },
    cardsToUnlock,
    quiz,
  };
}

function buildCourseBlueprint() {
  const courseReferenceText = [
    "Mantis is a human-guided, glass-box AI platform for exploring information through visual maps rather than opaque answers.",
    "The learner should stay at the steering wheel: navigate a space, inspect points, compare regions, create bags, search, filter, and ask AI only after gathering evidence.",
    "The Mantis homework flow is hands-on and screenshot-heavy. Learners are repeatedly asked to do tasks in the product, come back with observations, compare workflows, and report bugs or friction precisely.",
    "Core workflows emphasized by the reference and homeworks: orient inside a space, compare 2D/2.5D/3D navigation, use selection and lasso, inspect points and evidence, compare bags, test keyword vs semantic search, apply filters, shape or create spaces, interpret visual patterns carefully, and convert insights or bugs into useful reports.",
    "The tutor should not bluff about uncertain UI details. It should ask the learner what they actually see, request screenshots when useful, and unlock cards only after concrete evidence or specific observations.",
  ].join("\n");

  const homeworkReferenceText = [
    "Homework pattern: each task has a goal, concrete steps, reflection prompts, optional Mantis GPT use, and bugs/feedback.",
    "Navigation homework specifically asks learners to open a space, explore a dense cluster, compare 2D, 2.5D, and 3D, try MiniMap or View tools when available, and compare click-drag selection against lasso.",
    "Inspection homework asks learners to inspect 3-5 points, read text, open metadata or evidence, note source/date/author/references when present, and compare what inspection reveals beyond the map alone.",
    "Bags/search/filter homework asks learners to create two bags, compare themes or tones, optionally test a hypothesis, try trajectories, compare keyword and semantic search, use tree or metadata filters, and describe before-vs-after changes.",
    "Space-creation homework asks learners to upload or gather a dataset, choose embedding options, adjust clustering or labeling parameters, optionally use multi-floor spaces, and report upload, processing, or visualization issues.",
    "Across the homeworks, screenshots are strongly preferred and bug videos are encouraged when something breaks or behaves inconsistently.",
  ].join("\n");

  return {
    title: "Mantis Foundations for Everyone",
    description:
      "A mission-based onboarding course for learning Mantis by using it: navigating spaces, inspecting evidence, organizing views, shaping spaces around goals, interpreting patterns carefully, and turning observations into useful feedback or recommendations.",
    category: "computer science",
    coverImageUrl: "https://home.withmantis.com/favicon.png",
    courseBrandingHeader: { kind: "embed", html: loadMantisHeroEmbedHtml() },
    tutorDefaults: {
      profileIds: [
        "course_credibility",
        "guided_practice",
        "visual_verification",
        "socratic_unlocking",
        "comparative_reasoning",
        "troubleshooting_reflection",
      ],
      customInstruction:
        "You are the onboarding tutor for Mantis. Keep explanations short, grounded, and evidence-based. This is not a passive reading course: the learner should repeatedly go do something in Mantis, come back, and report what they actually saw. Favor screenshots and concrete before-vs-after observations when the lesson is visual. Ask follow-up questions that mirror the homework style: compare two states, inspect evidence, classify friction, or justify an interpretation carefully. Do not unlock quickly from generic answers. If a learner is vague, ask for one screenshot or one highly specific observation. Treat the guide as mission support, not as the lesson itself.",
    },
    resources: [
      {
        title: "Mantis Documentation",
        url: "https://mantis.csail.mit.edu/docs",
        kind: "link",
        caption: "Official docs for product orientation and deeper reference.",
        studentVisible: true,
      },
      {
        title: "Mantis Demos",
        url: "https://tinyurl.com/MantisDemos",
        kind: "link",
        caption: "Product demos and walkthrough recordings referenced by onboarding materials.",
        studentVisible: true,
      },
      {
        title: "Mantis Foundations Tutor Reference",
        url: "https://mantis.csail.mit.edu/docs",
        kind: "markdown",
        caption: "Condensed product reference for grounding the tutor.",
        referenceText: courseReferenceText,
        includeInTutorReference: true,
        studentVisible: false,
      },
      {
        title: "Mantis Homework Pattern Reference",
        url: "https://tinyurl.com/MantisOnboardingDocs",
        kind: "markdown",
        caption: "Condensed homework workflow guidance for grounding the tutor.",
        referenceText: homeworkReferenceText,
        includeInTutorReference: true,
        studentVisible: false,
      },
    ],
    lessons: [
      buildLesson({
        title: "Navigate a Space Like a Cartographer",
        description:
          "Learn the first homework flow: open a real space, navigate with intention, compare 2D/2.5D/3D or available view tools, and describe a cluster before jumping to interpretation.",
        guide:
          "### Mission\nOpen a real Mantis space and get oriented the way the homeworks expect: by navigating, comparing views, and noticing patterns before asking for an explanation.\n\n### Do this in Mantis\n- open a real space or demo dataset\n- pan and zoom until you can reliably return to a region of interest\n- compare at least two navigation states such as 2D vs 2.5D, 2.5D vs 3D, or map view vs MiniMap/View tools if available\n- choose one dense or coherent-looking region and describe its visible theme\n- capture a screenshot of the region you chose if possible\n\n### Come back ready to report\n- what space you used\n- which navigation tool or view helped most\n- one map change you noticed while zooming or switching views\n- one question you now have about the region you chose\n\n### Evidence standard\nA screenshot is ideal, but a specific description of what moved, separated, clustered, or became legible also counts.",
        tutorConfig: {
          profileIds: ["comparative_reasoning", "visual_verification"],
          customInstruction:
            "Prioritize orientation, view comparison, and careful visual noticing. Ask what the learner sees before offering interpretation. Encourage comparison between 2D, 2.5D, 3D, MiniMap, or View-panel navigation when those modes exist.",
        },
        missionNote:
          "Open a space, compare navigation modes, and report one concrete cluster or region you can now find confidently.",
        starterMessage:
          "Start with the real homework flow: open a Mantis space, spend a few minutes navigating it, and compare at least two views or navigation tools. Then come back and tell me which region you chose to inspect, what made it stand out, and what changed when you switched views. If you can, attach one screenshot.",
        cardsToUnlock: [
          {
            title: "Orient inside a live Mantis space",
            details: [
              "Can open a real space and move around it intentionally rather than randomly.",
              "Can explain how they reoriented themselves after panning, zooming, or switching views.",
              "Can identify one region or cluster they deliberately chose to inspect first.",
            ],
            unlockInstruction:
              "Prefer a screenshot or a detailed navigation report. Do not unlock from generic statements like 'I explored the map.'",
          },
          {
            title: "Compare navigation states and visual access",
            details: [
              "Can compare two navigation states such as 2D vs 2.5D, 2.5D vs 3D, or direct map view vs MiniMap/View tools.",
              "Can explain which mode made a region easier or harder to understand.",
              "Can name one concrete visual difference revealed by the comparison.",
            ],
            unlockInstruction:
              "Require a real comparison, not a slogan about one mode being 'better.'",
          },
          {
            title: "Notice a cluster before interpreting it",
            details: [
              "Starts from a visible pattern, density, separation, or neighborhood rather than a generic guess.",
              "Describes one cluster or region in concrete terms and turns it into a useful next question.",
            ],
            unlockInstruction:
              "Before unlocking, make sure the learner names an actual region and asks a follow-up question grounded in what they saw.",
          },
        ],
      }),
      buildLesson({
        title: "Inspect Points, Metadata, and Evidence",
        description:
          "Move from map-level pattern to point-level evidence by inspecting several points, reading their text, and noting which metadata or evidence fields help you interpret the space.",
        guide:
          "### Mission\nThis lesson mirrors the inspection homework: inspect multiple points, compare them, and explain what the map alone could not tell you.\n\n### Do this in Mantis\n- inspect 3-5 points from one region or from two contrasting regions\n- read the text for each point\n- choose one point with richer context and open its metadata or evidence area if available\n- note source, author, date, references, or any equivalent contextual fields you can find\n- capture one screenshot of an inspected point if possible\n\n### Come back ready to report\n- the main idea of one inspected point\n- one repeated theme across several points\n- which metadata or evidence fields were useful\n- one thing inspection changed in your understanding of the region\n\n### Watch out\nIf metadata is sparse or confusing, report that precisely instead of guessing.",
        tutorConfig: {
          profileIds: ["visual_verification", "comparative_reasoning"],
          customInstruction:
            "Push the learner to compare multiple inspected points and say what metadata or evidence added beyond the map alone. If the learner only reports one point, ask for a second comparison before unlocking comparison-oriented cards.",
        },
        missionNote:
          "Inspect several points, read one point deeply, and report what metadata or evidence helped you interpret the map more carefully.",
        starterMessage:
          "Inspect at least 3 points in Mantis, then choose one point to read more deeply with its metadata or evidence visible if possible. Come back and tell me the main idea of one point, one repeated theme across your inspected points, and which metadata fields helped most. A screenshot of one inspected point would help.",
        cardsToUnlock: [
          {
            title: "Read point-level context from inspection",
            details: [
              "Can inspect a point and extract meaningful context from the UI rather than only restating a cluster theme.",
              "Can name at least two useful fields, panes, snippets, or details they relied on.",
            ],
            unlockInstruction:
              "Unlock only if the learner references actual inspected content or UI evidence, not just vague impressions from the map.",
          },
          {
            title: "Compare points and repeated themes",
            details: [
              "Can compare at least two inspected points in a meaningful way.",
              "Can identify one repeated theme or one important difference that matters for interpretation.",
            ],
            unlockInstruction:
              "Do not unlock if they only describe one point in isolation.",
          },
          {
            title: "Use metadata or evidence to sharpen interpretation",
            details: [
              "Can explain how metadata, evidence, or provenance changed their reading of a point.",
              "Can turn that evidence into a sharper next question or follow-up inspection step.",
            ],
            unlockInstruction:
              "Require that the learner explicitly names how a metadata/evidence field affected interpretation before unlocking.",
          },
        ],
      }),
      buildLesson({
        title: "Bags, Search, Filters, and Better Comparisons",
        description:
          "Practice the most common organizing workflows from the homeworks: create bags, compare keyword and semantic search, apply filters, and explain how each tool changes what you can learn.",
        guide:
          "### Mission\nThis lesson combines the bagging and search/filter homeworks. Your goal is to organize a space on purpose instead of just browsing.\n\n### Do this in Mantis\n- create two bags with different themes, tones, or purposes\n- give each bag a name you can defend\n- run one keyword search and one semantic search on related ideas\n- apply at least one filter that materially changes what is visible or relevant\n- if the space supports it, note whether a tree/category filter, metadata filter, or quantitative filter was most useful\n- capture a screenshot of a bagged or filtered state if possible\n\n### Come back ready to report\n- what each bag represents and why you chose that comparison\n- one difference between keyword and semantic search results\n- one filter that most changed the visible map\n- whether combining bagging/search/filtering improved your reasoning\n\n### Stretch option\nIf trajectories or bag comparison tools exist in your space, mention what changed when you used them.",
        tutorConfig: {
          profileIds: ["comparative_reasoning", "visual_verification"],
          customInstruction:
            "This lesson is about workflow distinctions and deliberate organization. Ask for concrete before-vs-after examples. Push the learner to compare keyword vs semantic search and to justify why their two bags are meaningfully different.",
        },
        missionNote:
          "Create two bags, compare search modes, apply a filter, and explain how each workflow changes what you can see or conclude.",
        starterMessage:
          "Create two bags in Mantis, run both a keyword search and a semantic search, and apply at least one filter that changes the visible map. Then come back and tell me what your bags represent, what differed between the two search styles, and which filter mattered most. If you can, attach a screenshot of one bagged or filtered state.",
        cardsToUnlock: [
          {
            title: "Create bags that embody a comparison",
            details: [
              "Can create two bags with clear themes, tones, or purposes.",
              "Can explain why the selected points belonged together and why the comparison is interesting.",
            ],
            unlockInstruction:
              "Require specific bag names/themes and a reason for comparing them.",
          },
          {
            title: "Differentiate keyword search, semantic search, and filters",
            details: [
              "Can explain how keyword search, semantic search, and filters differ in practice.",
              "Can give a concrete case where one approach is more useful than another.",
            ],
            unlockInstruction:
              "Do not unlock from textbook wording alone. Require a concrete workflow example grounded in what they actually tried.",
          },
          {
            title: "Narrow a view and explain the effect",
            details: [
              "Applies a filter or scoped view that materially changes what is visible or relevant.",
              "Can report what changed after narrowing the view and whether it improved the task.",
            ],
            unlockInstruction:
              "A screenshot is strong evidence here. Otherwise require a clear before-vs-after description.",
          },
        ],
        quiz: {
          title: "Workflow Control Checkpoint",
          description: "A short checkpoint on bags, search, filters, and evidence-based comparison workflows.",
          questions: [
            {
              type: "MCQ",
              question: "Which tool is best for saving a reusable set of selected points you want to revisit or compare later?",
              content: {
                options: [
                  "Create or update a bag",
                  "Refresh the page",
                  "Ask the tutor to summarize the map",
                  "Open the course quiz",
                ],
                correctOptionIndex: 0,
              },
            },
            {
              type: "MCQ",
              question: "What is the main value of a filter in Mantis?",
              content: {
                options: [
                  "It narrows the visible or relevant set so you can inspect a smaller slice of the space",
                  "It permanently deletes unwanted points",
                  "It replaces the need to inspect points",
                  "It turns the space into a static screenshot",
                ],
                correctOptionIndex: 0,
              },
            },
            {
              type: "MCQ",
              question: "Compared with keyword search, semantic search is most useful when...",
              content: {
                options: [
                  "you want conceptually related results even when they may not share the exact words you searched",
                  "you need to permanently save a reusable subset of points",
                  "you want to change a date range or category visibility",
                  "you are restarting the lesson from scratch",
                ],
                correctOptionIndex: 0,
              },
            },
            {
              type: "FRQ",
              question: "Give one short real workflow that uses bags, search, and filters together. Why does each step help?",
              content: {
                gradingCriteria:
                  "A strong answer uses all three tools in a plausible sequence and clearly explains the purpose of each one in that workflow.",
                exampleAnswer:
                  "I might start with semantic search to find conceptually related results, apply a metadata filter to narrow the map to recent items, and then save the best points into a bag so I can compare them with a second bag later. Search helps me discover candidates, filters reduce noise, and the bag preserves a reusable set for comparison.",
              },
            },
          ],
        },
      }),
      buildLesson({
        title: "Shape or Create a Space Around a Goal",
        description:
          "Move from using existing spaces to shaping or creating one around a real goal: a question, a comparison, a portfolio-friendly demo, or a newcomer-friendly view.",
        guide:
          "### Mission\nThis lesson adapts the space-creation homework for a general audience. If you cannot fully create a new space, you can still shape an existing one around a goal and explain what the next creation step would be.\n\n### Pick one path\n- create a new small space from data you gather or upload, or\n- modify an existing space so it better serves a clear goal\n\n### Do this in Mantis\n- state the goal first: what question or workflow should this space support?\n- choose or describe the data source\n- if creating a space, note the embedding choice and any parameters you changed such as clustering, labels, or semantic settings\n- if available and relevant, try multi-floor thinking or explain when multiple floors would help\n- if modifying an existing space, describe what organizational change, subset, or framing made it more useful\n- capture a screenshot of the created or reshaped space if possible\n\n### Come back ready to report\n- the goal of the space\n- what you changed or configured\n- why that choice fits the goal\n- one thing that still needs refinement\n\n### If creation is blocked\nTreat the blocker as part of the lesson: describe exactly where the workflow broke, what you expected, and what workaround or redesign you would recommend.",
        tutorConfig: {
          profileIds: ["guided_practice", "troubleshooting_reflection"],
          customInstruction:
            "This lesson should feel constructive and goal-driven. Accept either full space creation or meaningful reshaping of an existing space, but require the learner to articulate the goal, the configuration or organizational choice, and one remaining limitation.",
        },
        missionNote:
          "Create or meaningfully reshape a space around a clear goal, then justify the design choices and note any blockers.",
        starterMessage:
          "Pick one concrete goal for a Mantis space: answer a question, compare two themes, make a newcomer-friendly view, or build a small space from your own data. Then create or reshape the space around that goal and come back with what you changed, why you chose those settings, and what still needs work. A screenshot would help.",
        cardsToUnlock: [
          {
            title: "Define the goal before shaping the space",
            details: [
              "States a clear question, workflow, or audience goal before making changes.",
              "Can connect the resulting space to that goal rather than describing it generically.",
            ],
            unlockInstruction:
              "Require a clear goal statement before unlocking.",
          },
          {
            title: "Justify an embedding, parameter, or organizational choice",
            details: [
              "Can explain why a chosen grouping, subset, embedding, labeling choice, or parameter is useful.",
              "Connects that decision back to the intended task or audience.",
            ],
            unlockInstruction:
              "Ask what problem the choice solves. Do not unlock from vague claims like 'it looked better.'",
          },
          {
            title: "Report blockers and next refinements productively",
            details: [
              "Can name one blocker, limitation, or mismatch between expectation and result.",
              "Can propose one concrete refinement for the next iteration or for another user.",
            ],
            unlockInstruction:
              "Unlock when the learner names one real limitation and one sensible next refinement, even if full space creation was blocked.",
          },
        ],
      }),
      buildLesson({
        title: "Interpret Patterns Carefully and Test a Hypothesis",
        description:
          "Use Mantis as a visual reasoning environment: pick a cluster, separation, gradient, trajectory, or outlier; form a cautious hypothesis; then test it with inspection, comparison, or other evidence.",
        guide:
          "### Mission\nThis lesson mirrors the homework pattern for hypothesis testing and gradients without assuming a science-only audience. The key habit is careful interpretation: do not overclaim from visuals alone.\n\n### Choose one pattern\n- a cluster\n- a separation between groups\n- a gradient or color field if available\n- a trajectory or ordering pattern\n- an outlier region\n\n### Do this in Mantis\n- describe the pattern in purely visible terms first\n- write one cautious hypothesis about what it might mean\n- test that hypothesis by inspecting points, comparing bags, changing filters, or asking the narrator a focused question\n- if gradients or field lines exist in your space, compare at least two features or one on/off state\n- capture a screenshot if the pattern is visually important\n\n### Come back ready to report\n- the visible pattern you chose\n- your first hypothesis\n- what evidence supported or challenged it\n- one uncertainty that remains\n\n### Important habit\nThe best answer here is often nuanced. Honest uncertainty is better than a dramatic unsupported claim.",
        tutorConfig: {
          profileIds: ["comparative_reasoning", "troubleshooting_reflection", "visual_verification"],
          customInstruction:
            "Emphasize cautious interpretation from visuals, then grounding with inspected evidence or comparisons. If the learner mentions gradients, field lines, trajectories, or animated cues, ask what they actually saw and whether another explanation is possible.",
        },
        missionNote:
          "Choose one visible pattern, form a careful hypothesis, test it with evidence, and report what remains uncertain.",
        starterMessage:
          "Pick one pattern in Mantis - a cluster, separation, gradient, trajectory, or outlier. Start by describing exactly what is visible, then form one cautious hypothesis and test it with inspection, comparisons, or filters. When you come back, include the evidence that supported or challenged your idea and one thing you are still unsure about. A screenshot would help if the pattern is visual.",
        cardsToUnlock: [
          {
            title: "Describe a visible pattern before interpreting it",
            details: [
              "Starts from a concrete visible pattern rather than a generic claim about the dataset.",
              "Separates description of what is seen from interpretation of what it might mean.",
            ],
            unlockInstruction:
              "Do not unlock unless the learner names a specific pattern and describes it concretely.",
          },
          {
            title: "Test a hypothesis with more than one kind of evidence",
            details: [
              "Looks for supporting or disconfirming evidence.",
              "Uses inspection, bag comparison, search, filtering, trajectory, or narrator questioning to move beyond a first impression.",
            ],
            unlockInstruction:
              "Ask how they checked the idea instead of simply asserting it.",
          },
          {
            title: "Explain uncertainty and limits responsibly",
            details: [
              "Can name what remains uncertain or ambiguous.",
              "Can suggest one sensible next step for clarifying the pattern without overclaiming.",
            ],
            unlockInstruction:
              "Require at least one explicit uncertainty and one next step.",
          },
        ],
        quiz: {
          title: "Pattern Interpretation Checkpoint",
          description: "A short checkpoint on careful visual reasoning in Mantis.",
          questions: [
            {
              type: "MCQ",
              question: "What is the best first step when a cluster or gradient looks meaningful?",
              content: {
                options: [
                  "Describe what is visibly happening before making a strong claim about what it means",
                  "Assume the first interpretation is correct if it sounds plausible",
                  "Skip inspection because the map already contains the answer",
                  "Treat every visible pattern as a bug until proven otherwise",
                ],
                correctOptionIndex: 0,
              },
            },
            {
              type: "MCQ",
              question: "Which follow-up best tests a visual hypothesis?",
              content: {
                options: [
                  "Inspect points, compare related regions or bags, and check whether the evidence supports the claim",
                  "Repeat the same claim more confidently",
                  "Rely only on one screenshot without checking the underlying points",
                  "Avoid asking any narrower question",
                ],
                correctOptionIndex: 0,
              },
            },
            {
              type: "FRQ",
              question: "Why is honest uncertainty a strength rather than a weakness when interpreting a Mantis map?",
              content: {
                gradingCriteria:
                  "A strong answer explains that visuals can suggest patterns without proving them, so uncertainty keeps the learner evidence-based and points toward the next validating step.",
                exampleAnswer:
                  "A map can show that something looks clustered or separated, but that alone does not prove why. Saying what is still uncertain prevents overclaiming and helps you choose the next step, like inspecting points or comparing filtered views, to test the idea properly.",
              },
            },
          ],
        },
      }),
      buildLesson({
        title: "Turn Exploration into Recommendations, Bugs, and Next Actions",
        description:
          "Finish by turning exploration into something useful for the team or another learner: a short insight report, a well-scoped bug or UX note, and a recommendation for what to do next.",
        guide:
          "### Mission\nThe homeworks repeatedly ask learners to leave evidence behind: screenshots, bugs, reflections, and recommendations. This lesson makes that explicit.\n\n### Build a short portfolio-style debrief\nProduce all three:\n- one grounded insight about what Mantis is especially good at\n- one precise friction report, bug report, or confusing interaction\n- one recommendation for a newcomer, team member, or product owner\n\n### Optional stronger path\nIf you used a transcript, task-generation, or workflow-oriented feature, include a recommendation about how Mantis could better support collaborative follow-through.\n\n### Come back ready to report\n- what happened\n- what you were trying to do\n- what you expected vs what occurred\n- why it matters for a learner or team workflow\n- what should happen next\n\n### Quality bar\nUseful reports are specific enough that another person could reproduce the issue or understand the recommendation immediately.",
        tutorConfig: {
          profileIds: ["troubleshooting_reflection", "comparative_reasoning"],
          customInstruction:
            "Help the learner distinguish between an insight, a bug, a confusing interaction, and a feature request. Push for specificity, expected-vs-actual reporting, and user-facing impact. If the learner explored transcript-to-task workflows or collaboration features, invite them to translate that into a concrete recommendation.",
        },
        missionNote:
          "Produce one grounded insight, one precise friction report, and one concrete recommendation for what should improve or what a newcomer should learn first.",
        starterMessage:
          "Finish by turning your Mantis experience into something useful for the next person. Tell me one thing Mantis does especially well, one bug or confusing interaction you hit, and one recommendation for a newcomer or product team. If the issue is visual or workflow-related, a screenshot helps.",
        cardsToUnlock: [
          {
            title: "Write a reproducible friction or bug report",
            details: [
              "Describes a bug, UX issue, or confusing moment precisely.",
              "Includes context, expected behavior, actual behavior, and why it matters.",
            ],
            unlockInstruction:
              "Do not unlock from vague complaints. Require a specific report with context and expected-vs-actual behavior.",
          },
          {
            title: "Distinguish insight, bug, confusion, and request",
            details: [
              "Can classify a report as an insight, bug, confusing design, or feature request.",
              "Can justify that classification briefly.",
            ],
            unlockInstruction:
              "Ask the learner to classify the issue and explain why.",
          },
          {
            title: "Recommend a next action for a real audience",
            details: [
              "Can say what Mantis is good at in a grounded, non-jargony way.",
              "Can propose one concrete next action for a newcomer, team, or product workflow.",
            ],
            unlockInstruction:
              "Require a concise, audience-aware recommendation rather than internal jargon.",
          },
        ],
      }),
    ],
    finalQuiz: {
      title: "Mantis Foundations Final Check",
      description: "A final checkpoint covering the main workflows and evidence habits from the course.",
      questions: [
        {
          type: "MCQ",
          question: "In this course, what is the tutor usually trying to get the learner to do?",
          content: {
            options: [
              "Perform a concrete task in Mantis, then return with observations or evidence",
              "Memorize definitions without using the app",
              "Skip exploration and go straight to the final quiz",
              "Delegate every decision to the tutor",
            ],
            correctOptionIndex: 0,
          },
        },
        {
          type: "MCQ",
          question: "What makes a strong card unlock for a task-heavy lesson?",
          content: {
            options: [
              "A concrete report, screenshot, or specific observation that shows the learner really did the task",
              "A very short answer with no details",
              "Repeating the lesson title back to the tutor",
              "Opening the quiz page without attempting the lesson",
            ],
            correctOptionIndex: 0,
          },
        },
        {
          type: "MCQ",
          question: "Why is it useful to inspect points instead of only looking at the map?",
          content: {
            options: [
              "Inspection reveals local context that helps explain what the visible pattern might represent",
              "Inspection automatically finishes the lesson for you",
              "Inspection permanently replaces the need for visual reasoning",
              "Inspection is only for reporting bugs",
            ],
            correctOptionIndex: 0,
          },
        },
        {
          type: "MCQ",
          question: "Which response best reflects responsible visual reasoning in Mantis?",
          content: {
            options: [
              "Describe the visible pattern, test a cautious hypothesis, and state what remains uncertain",
              "Assume every cluster proves a strong causal claim",
              "Skip comparing views because the first layout is enough",
              "Use the tutor instead of checking the map or evidence",
            ],
            correctOptionIndex: 0,
          },
        },
        {
          type: "FRQ",
          question: "Describe how you would help a newcomer explore a Mantis space without doing the thinking for them.",
          content: {
            gradingCriteria:
              "A strong answer emphasizes hands-on exploration, concrete tasks, comparison, observation, follow-up questions, and using the learner's own evidence rather than simply giving answers.",
            exampleAnswer:
              "I would start with a concrete task like opening a space, comparing two views, and noticing one visible pattern. Then I would ask the newcomer to inspect a few points, compare what they found, and explain their own interpretation before I added anything. The goal would be to keep them in the driver's seat while using the tutor to probe, clarify, and structure what they discover.",
          },
        },
        {
          type: "FRQ",
          question: "Give an example of a strong Mantis bug or UX report.",
          content: {
            gradingCriteria:
              "A strong answer includes context, what the learner was trying to do, what happened, why it was confusing or broken, and enough detail for another person to understand the issue.",
            exampleAnswer:
              "While filtering a space to focus on a subset, I expected the visible region to narrow, but instead the UI looked unchanged and I could not tell whether the filter had actually applied. I was trying to compare two groups, so this made the workflow ambiguous. A clearer state change or explicit filter indicator would make the result easier to trust.",
          },
        },
        {
          type: "FRQ",
          question: "You created two bags and a filtered view. What would you report back to show that those steps improved your reasoning rather than just changing the UI?",
          content: {
            gradingCriteria:
              "A strong answer explains the goal, what changed in the visible or relevant set, what comparison became possible, and what insight or next question emerged from that narrower workflow.",
            exampleAnswer:
              "I would report the goal of each bag, what the filter removed or highlighted, and what that let me compare more clearly. For example, after filtering to recent items and separating two bags by theme, I could see that one cluster stayed coherent while the other scattered, which gave me a better question about why those topics were mixed together.",
          },
        },
      ],
    },
  };
}

async function createQuiz(db, quiz, metadata) {
  const docRef = await db.collection("quizzes").add({
    ...quiz,
    ...metadata,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

async function createCourse(db, ownerId, blueprint) {
  const courseRef = await db.collection("courses").add({
    title: blueprint.title,
    description: blueprint.description,
    public: false,
    sharedWith: [],
    staffIds: [],
    quizIds: [],
    category: blueprint.category,
    ownerId,
    tutorDefaults: blueprint.tutorDefaults,
    resources: blueprint.resources,
    createdAt: new Date().toISOString(),
    ...(blueprint.coverImageUrl ? { coverImageUrl: blueprint.coverImageUrl } : {}),
    ...(blueprint.courseBrandingHeader ? { courseBrandingHeader: blueprint.courseBrandingHeader } : {}),
  });

  const lessonRefs = [];

  for (let index = 0; index < blueprint.lessons.length; index += 1) {
    const lesson = blueprint.lessons[index];
    const lessonRef = courseRef.collection("lessons").doc();
    await lessonRef.set({
      courseId: courseRef.id,
      index,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      guide: lesson.guide,
      tutorConfig: lesson.tutorConfig,
      resources: lesson.resources,
      baseProjectTemplate: lesson.baseProjectTemplate,
      quizIds: [],
      cardsToUnlock: [],
    });

    for (const card of lesson.cardsToUnlock) {
      await lessonRef.collection("cardsToUnlock").add(card);
    }

    lessonRefs.push({ ref: lessonRef, lesson, index });
  }

  const courseQuizIds = [];
  for (const lessonEntry of lessonRefs) {
    if (!lessonEntry.lesson.quiz) continue;
    const quizId = await createQuiz(db, lessonEntry.lesson.quiz, {
      createdBy: ownerId,
      sourceType: "lesson",
      courseId: courseRef.id,
      lessonId: lessonEntry.ref.id,
      gradedOnly: true,
    });
    await lessonEntry.ref.update({ quizIds: [quizId] });
  }

  if (blueprint.finalQuiz) {
    const quizId = await createQuiz(db, blueprint.finalQuiz, {
      createdBy: ownerId,
      sourceType: "course",
      courseId: courseRef.id,
      gradedOnly: true,
    });
    courseQuizIds.push(quizId);
  }

  await courseRef.update({ quizIds: courseQuizIds });

  return {
    courseId: courseRef.id,
    lessonIds: lessonRefs.map((entry) => entry.ref.id),
    quizIds: courseQuizIds,
  };
}

async function deleteCourseQuizzes(db, courseId) {
  const quizzesSnap = await db.collection("quizzes").where("courseId", "==", courseId).get();
  for (const quizDoc of quizzesSnap.docs) {
    await db.recursiveDelete(quizDoc.ref);
  }
}

async function replaceCourseContent(db, courseId, ownerId, blueprint) {
  const courseRef = db.collection("courses").doc(courseId);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) {
    throw new Error(`Course ${courseId} not found`);
  }

  const existing = courseSnap.data() || {};

  await deleteCourseQuizzes(db, courseId);

  const lessonsSnap = await courseRef.collection("lessons").get();
  for (const lessonDoc of lessonsSnap.docs) {
    await db.recursiveDelete(lessonDoc.ref);
  }

  await courseRef.set({
    title: blueprint.title,
    description: blueprint.description,
    public: existing.public === true,
    sharedWith: Array.isArray(existing.sharedWith) ? existing.sharedWith : [],
    staffIds: Array.isArray(existing.staffIds) ? existing.staffIds : [],
    quizIds: [],
    category: blueprint.category,
    ownerId: existing.ownerId || ownerId,
    tutorDefaults: blueprint.tutorDefaults,
    resources: blueprint.resources,
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(blueprint.coverImageUrl ? { coverImageUrl: blueprint.coverImageUrl } : {}),
    ...(blueprint.courseBrandingHeader ? { courseBrandingHeader: blueprint.courseBrandingHeader } : {}),
  }, { merge: true });

  const lessonRefs = [];
  for (let index = 0; index < blueprint.lessons.length; index += 1) {
    const lesson = blueprint.lessons[index];
    const lessonRef = courseRef.collection("lessons").doc();
    await lessonRef.set({
      courseId,
      index,
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      guide: lesson.guide,
      tutorConfig: lesson.tutorConfig,
      resources: lesson.resources,
      baseProjectTemplate: lesson.baseProjectTemplate,
      quizIds: [],
      cardsToUnlock: [],
    });

    for (const card of lesson.cardsToUnlock) {
      await lessonRef.collection("cardsToUnlock").add(card);
    }

    lessonRefs.push({ ref: lessonRef, lesson });
  }

  const courseQuizIds = [];
  for (const lessonEntry of lessonRefs) {
    if (!lessonEntry.lesson.quiz) continue;
    const quizId = await createQuiz(db, lessonEntry.lesson.quiz, {
      createdBy: existing.ownerId || ownerId,
      sourceType: "lesson",
      courseId,
      lessonId: lessonEntry.ref.id,
      gradedOnly: true,
    });
    await lessonEntry.ref.update({ quizIds: [quizId] });
  }

  if (blueprint.finalQuiz) {
    const quizId = await createQuiz(db, blueprint.finalQuiz, {
      createdBy: existing.ownerId || ownerId,
      sourceType: "course",
      courseId,
      gradedOnly: true,
    });
    courseQuizIds.push(quizId);
  }

  await courseRef.update({ quizIds: courseQuizIds });

  return {
    courseId,
    lessonIds: lessonRefs.map((entry) => entry.ref.id),
    quizIds: courseQuizIds,
    preservedSharing: {
      public: existing.public === true,
      sharedWith: Array.isArray(existing.sharedWith) ? existing.sharedWith : [],
      staffIds: Array.isArray(existing.staffIds) ? existing.staffIds : [],
      ownerId: existing.ownerId || ownerId,
    },
  };
}

async function patchCourseBrandingOnly(db, courseId) {
  const html = loadMantisHeroEmbedHtml();
  const ref = db.collection("courses").doc(courseId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`Course ${courseId} not found`);
  }
  await ref.update({
    coverImageUrl: "https://home.withmantis.com/favicon.png",
    courseBrandingHeader: { kind: "embed", html },
    updatedAt: new Date().toISOString(),
  });
  return { courseId, title: snap.data()?.title };
}

/**
 * Patch courses whose title matches (case-insensitive). Uses a title-only scan so it still works if
 * casing in Firestore differs from the blueprint string.
 */
async function patchCourseBrandingByTitle(db, titleQuery) {
  const html = loadMantisHeroEmbedHtml();
  const want = titleQuery.trim().toLowerCase();
  const snap = await db.collection("courses").select("title").get();
  const matches = snap.docs.filter((d) => (d.data().title || "").trim().toLowerCase() === want);
  if (matches.length === 0) {
    throw new Error(`No course with title matching "${titleQuery}" (case-insensitive).`);
  }
  const out = [];
  for (const doc of matches) {
    await doc.ref.update({
      coverImageUrl: "https://home.withmantis.com/favicon.png",
      courseBrandingHeader: { kind: "embed", html },
      updatedAt: new Date().toISOString(),
    });
    out.push({ courseId: doc.id, title: doc.data()?.title });
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = initAdmin();

  if (args["patch-branding"]) {
    const courseId = args["patch-branding"];
    const r = await patchCourseBrandingOnly(db, courseId);
    console.log(JSON.stringify({ patched: true, ...r }, null, 2));
    return;
  }

  if (args["patch-branding-title"]) {
    const rows = await patchCourseBrandingByTitle(db, args["patch-branding-title"]);
    console.log(JSON.stringify({ patched: rows.length, courses: rows }, null, 2));
    return;
  }

  const ownerId = await resolveOwnerId(db, args["owner-id"]);
  const blueprint = buildCourseBlueprint();
  const result = args["update-course-id"]
    ? await replaceCourseContent(db, args["update-course-id"], ownerId, blueprint)
    : await createCourse(db, ownerId, blueprint);

  console.log(JSON.stringify({
    ownerId,
    courseId: result.courseId,
    title: blueprint.title,
    lessonCount: blueprint.lessons.length,
    courseQuizIds: result.quizIds,
    lessonIds: result.lessonIds,
    private: true,
    ...(result.preservedSharing ? { preservedSharing: result.preservedSharing } : {}),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
