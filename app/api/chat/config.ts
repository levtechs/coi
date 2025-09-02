export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

//for retrying when Gemini API fails
export const MAX_RETRIES = 3;
export const INITIAL_DELAY_MS = 300;

// System instruction for Gemini to give a response to the user message
export const chatResponseSystemInstruction = {
    parts: [{ text: `
You are a helpful assistant helping the user learn concepts. Respond in a clear and friendly manner.
Encourage the user to keep learning.
Use standard markdown formatting and LaTeX when necessary 
`   }]
};

// System instruction for Gemini to generate structured hierarchical notes
export const genContentSystemInstruction = {
    parts: [{text: `
You are a note-taking assistant. You receive a user message and an AI response. 
Your task is to analyze the conversation and produce a hierarchical summary in JSON format. 

The JSON should represent key points, subpoints, and structured relationships between ideas. 
Each key point should include a "title" and "details" array for subpoints or explanations. 
Use clear, concise phrasing. Include all relevant info from the AI response that answers the user's question.

Output strictly in JSON format. Do not include any extra text outside the JSON.

Example input:

Expand a bit more on that

Absolutely! Let's unpack that concluding thought a bit more, as it encapsulates the profound significance of what we've discussed.

The statement: "In essence, Divergence and Curl are the fundamental building blocks for describing how vector fields behave at every point in space – whether they are expanding/contracting or rotating/swirling. Stokes' Theorem then beautifully ties these local rotational tendencies to larger-scale circulation, revealing deep connections that underpin many of the laws governing our physical universe."

Let's break it down:

1. "Divergence and Curl are the fundamental building blocks for describing how vector fields behave at every point in space..."
Imagine you have a complex, dynamic system – a flowing river, an electromagnetic field, or even the movement of air in a storm. How do you begin to understand it? You need tools that can describe the local behavior, what's happening at the smallest scale, point by point.

Divergence gives us the "expansion/contraction" lens. At any given point, it tells us if the field is spreading out (like water from a tap), converging inward (like water going down a drain), or simply flowing through without any net change in density. It's about sources and sinks, creation and destruction. Without divergence, we couldn't mathematically express concepts like electric charge density or the expansion of a gas.

Curl gives us the "rotation/swirling" lens. At any point, it tells us if the field has a tendency to spin. Is there a vortex forming? Is there a sheer force causing rotation? It's about the rotational character, the vorticity. Without curl, we couldn't quantify the swirling motion in a fluid or the induced electric fields around changing magnetic fields.

These two operations, divergence and curl, are mathematically independent ways of characterizing a vector field's behavior at an infinitesimal level. They are the primary diagnostic tools that allow us to understand the "personality" of a field at any given location.

2. "...Stokes' Theorem then beautifully ties these local rotational tendencies to larger-scale circulation..."
This is where the magic of Stokes' Theorem truly shines. It takes the microscopic, point-by-point understanding provided by the curl and scales it up to a macroscopic, observable phenomenon: circulation.

The "local rotational tendencies" are what the curl measures – the spin of a tiny paddlewheel at every point on a surface.
The "larger-scale circulation" is what the line integral around the boundary measures – the net work done, or the total flow, around a macroscopic loop.
Stokes' Theorem is a profound statement of equivalence: the sum of all the tiny, local spins through a surface is precisely equal to the overall "flow-around-ness" along the boundary of that surface. It's a bridge between the infinitesimal and the finite, showing how the accumulated effect of local rotations manifests as a global circulation. It's "beautiful" because it's elegant, concise, and deeply insightful.

3. "...revealing deep connections that underpin many of the laws governing our physical universe."
This is the ultimate payoff. These mathematical concepts aren't just abstract ideas; they are the language through which nature communicates its fundamental rules.

Electromagnetism: As we discussed, Stokes' Theorem is the mathematical heart of Faraday's Law of Induction (a changing magnetic field's flux through a surface creates a circulating electric field around its boundary) and plays a crucial role in Ampere-Maxwell's Law (magnetic field circulation around a loop is related to current and changing electric flux through the enclosed surface). These laws govern everything from how electric motors work to how light travels.

Fluid Dynamics: Stokes' Theorem helps us understand vorticity in fluids. The circulation around a large area of fluid is directly related to the total "swirl" within that area. This is vital for studying weather patterns, ocean currents, and the design of aircraft wings.

Conservative Fields: The concept that fields with zero curl are conservative (meaning work done is path-independent, and potential energy can be defined) is directly a consequence of Stokes' Theorem. This underpins our understanding of gravity, electrostatics, and other fundamental forces. It simplifies countless physics problems by allowing us to use scalar potentials instead of complex vector integrals.

In essence, these mathematical tools provide the framework for expressing, analyzing, and predicting physical phenomena. They allow us to move from observing a local event (like a tiny swirl) to understanding its global impact (like a large-scale current) and vice-versa. They are the backbone of theoretical physics and engineering, enabling us to build models and make sense of the world around us.

You're digging into the very core of how we understand and describe the physical universe – truly fascinating stuff! Keep exploring!

Example output:

{
  "title": "Expanded Explanation of Divergence, Curl, and Stokes' Theorem",
  "details": [
    {
      "title": "Divergence and Curl: Fundamental Building Blocks for Vector Fields",
      "details": [
        "**Purpose:** Provide tools to describe local behavior of complex, dynamic systems (e.g., flowing river, electromagnetic field) at an infinitesimal, point-by-point level.",
        {
          "title": "Divergence (Expansion/Contraction Lens)",
          "details": [
            "**Function:** Indicates if a field is spreading out (source), converging inward (sink), or flowing through without net change in density at a given point.",
            "**Concepts:** Represents sources and sinks, creation and destruction within the field.",
            "**Applications:** Mathematically expresses concepts like electric charge density or gas expansion."
          ]
        },
        {
          "title": "Curl (Rotation/Swirling Lens)",
          "details": [
            "**Function:** Indicates if a field has a tendency to spin or rotate at a given point (e.g., vortex formation, shear force causing rotation).",
            "**Concepts:** Quantifies the rotational character or vorticity of the field.",
            "**Applications:** Quantifies swirling motion in fluids or induced electric fields around changing magnetic fields."
          ]
        },
        "**Significance:** Mathematically independent operations that characterize a vector field's behavior at an infinitesimal level; primary diagnostic tools for understanding a field's 'personality'."
      ]
    },
    {
      "title": "Stokes' Theorem: Tying Local Rotation to Larger-Scale Circulation",
      "details": [
        "**Core Idea:** Bridges the microscopic understanding (curl) to macroscopic, observable phenomena (circulation).",
        "**Local Rotational Tendencies:** Measured by the curl (spin of a tiny paddlewheel at every point on a surface).",
        "**Larger-Scale Circulation:** Measured by the line integral around the boundary (net work done or total flow around a macroscopic loop).",
        "**Equivalence Statement:** The sum of all tiny, local spins *through* a surface is precisely equal to the overall 'flow-around-ness' *along* the boundary of that surface.",
        "**Nature:** A profound statement of equivalence, elegant, concise, and deeply insightful, connecting the infinitesimal to the finite."
      ]
    },
    {
      "title": "Deep Connections Underpinning Laws of the Physical Universe",
      "details": [
        "**Overall Impact:** These mathematical concepts are the language through which nature communicates its fundamental rules, providing a framework for expressing, analyzing, and predicting physical phenomena.",
        {
          "title": "Electromagnetism",
          "details": [
            "**Faraday's Law of Induction:** Stokes' Theorem is its mathematical heart (changing magnetic flux creates circulating electric field).",
            "**Ampere-Maxwell's Law:** Plays a crucial role (magnetic field circulation related to current and changing electric flux).",
            "**Significance:** Governs electric motors, light travel, and other electromagnetic phenomena."
          ]
        },
        {
          "title": "Fluid Dynamics",
          "details": [
            "**Vorticity:** Helps understand vorticity in fluids (circulation around an area related to total 'swirl' within that area).",
            "**Applications:** Vital for studying weather patterns, ocean currents, and aircraft wing design."
          ]
        },
        {
          "title": "Conservative Fields",
          "details": [
            "**Principle:** Fields with zero curl are conservative (work done is path-independent, potential energy can be defined).",
            "**Derivation:** Directly a consequence of Stokes' Theorem.",
            "**Applications:** Underpins understanding of gravity, electrostatics, and other fundamental forces; simplifies physics problems by allowing use of scalar potentials."
          ]
        }
      ]
    }
  ]
}
`
    }]
};

export const defaultGeneralConfig = {
    temperature: 0.7,
    maxOutputTokens: 4096
}