export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";

// ==== settings ====

//for retrying when Gemini API fails
export const MAX_RETRIES = 3;
export const INITIAL_DELAY_MS = 300;

export const defaultGeneralConfig = {
    temperature: 0.7,
}

export const limitedGeneralConfig = {
    temperature: 0.7,
    maxOutputTokens: 4096
}

// ==== prompts ====

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
There will be an example input and output at the end of this instruction.
The JSON should represent key points, subpoints, and structured relationships between ideas.
Each key point should include a "title" and "details" array for subpoints or explanations.
Use clear, concise phrasing. Include all relevant info from the AI response that answers the user's question.
Use markdown formatting if applicable.
Return the entire new JSON.
Output strictly in JSON format. Do not include any extra text outside the JSON.

EXAMPLE INPUT:

{
  "user_message": "Can you give me a summary of divergence, curl, and Stokes' theorem?",
  "ai_response": "Of course. Let's break down these core concepts of vector calculus.
First, you have the two main local operators: Divergence and Curl. Think of them as diagnostic tools for understanding what a vector field is doing at any single point.
Divergence measures the tendency of a field to expand from or contract toward a point. We call these 'sources' and 'sinks'. So, it handles expansion and contraction.
Curl measures the tendency of a field to rotate or swirl around a point. It quantifies the 'vorticity' of the field.
Then you have Stokes' Theorem, which is a powerful bridge between local and global behavior. It connects the local, microscopic rotation within a surface (measured by the curl) to the overall circulation of the field around the boundary of that surface (measured by a line integral).
This theorem is incredibly important because it reveals deep connections in the laws of physics, forming the foundation for key principles in Electromagnetism and Fluid Dynamics."
}

EXAMPLE CORRESPONDING OUTPUT:

{
  "title": "Expanded Explanation of Vector Calculus Theorems",
  "details": [
    {
      "title": "Divergence and Curl: Local Field Behavior",
      "details": [
        "Divergence handles expansion/contraction (sources/sinks).",
        "Curl handles rotation/swirling (vorticity).",
        "These are diagnostic tools for a field's behavior."
      ]
    },
    {
      "title": "Stokes' Theorem (Curl-to-Circulation)",
      "details": [
        "Connects local curl (microscopic spin) to larger-scale circulation (line integral).",
        "Reveals deep connections in physical laws, e.g., Electromagnetism and Fluid Dynamics."
      ]
    }
  ]
}`
    }]
};

// System instruction for Gemini to update existing structured hierarchical notes
export const updateContentSystemInstruction = {
    parts: [{text: `
You are a note-taking assistant. You receive a hierarchical summary in JSON format, a user message and an AI response. 
Your task is to analyze the conversation and update the given hierarchical summary in JSON format, based on the new information.
There will be an example input and output at the end of this instruction. 

The JSON should represent key points, subpoints, and structured relationships between ideas.
Keep as much of the existing content and structure of the given JSON as possible, adding childeren and new sections beside and under the existing ones.  
Each key point should include a "title" and "details" array for subpoints or explanations. 
Use clear, concise phrasing. Include all relevant info from the AI response that answers the user's question.
Use markdown formatting if applicable. 

Return the entire new JSON.
Output strictly in JSON format. Do not include any extra text outside the JSON.

EXAMPLE INPUT:

{
  "existing_summary": {
    "title": "Expanded Explanation of Vector Calculus Theorems",
    "details": [
      {
        "title": "Divergence and Curl: Local Field Behavior",
        "details": [
          "Divergence handles expansion/contraction (sources/sinks).",
          "Curl handles rotation/swirling (vorticity).",
          "These are diagnostic tools for a field's behavior."
        ]
      },
      {
        "title": "Stokes' Theorem (Curl-to-Circulation)",
        "details": [
          "Connects local curl (microscopic spin) to larger-scale circulation (line integral).",
          "Reveals deep connections in physical laws, e.g., Electromagnetism and Fluid Dynamics."
        ]
      }
    ]
  },
  "user_message": "That makes sense for circulation. But what about the other major theorem, the one related to divergence? How does that fit in?",
  "ai_response": "You are referring to the Divergence Theorem, often called Gauss's Theorem! If Stokes' Theorem relates the local *rotation* (Curl) inside a surface to the circulation on its boundary, the Divergence Theorem relates the local *expansion* (Divergence) inside a volume to the total flux flowing out across its closed boundary surface. \n\nFormally, the theorem states that the net outward flux of a vector field through a closed surface is equal to the integral of the divergence of the field over the volume enclosed by that surface. \n\nThink of a gas expanding. The divergence tells you how much expansion is happening *at every single point* inside the volume. The integral of the divergence across the whole volume gives you the total output. The flux is the measure of how much stuff actually crosses the boundary of the container. The theorem states these two measurements must be equal.\n\nThis theorem is absolutely vital in physics, especially when dealing with concepts like fluid flow, heat transfer, or electrostatics (where it forms Gauss's Law: relating the electric flux out of a volume to the total charge inside). It completes the picture alongside Stokes' Theorem, showing how both expansion/contraction (divergence) and rotation (curl) link local infinitesimal behavior to global macroscopic results (flux and circulation, respectively)."
}

EXAMPLE CORRESPONDING OUTPUT:

{
  "title": "Expanded Explanation of Vector Calculus Theorems",
  "details": [
    {
      "title": "Divergence Theorem (Gauss's Theorem): Linking Local Expansion to Global Flux",
      "details": [
        "**Core Relationship:** If Stokes' Theorem handles rotation/circulation, the Divergence Theorem relates the local *expansion* (Divergence) inside a volume to the total flux flowing out across its closed boundary surface.",
        "**Formal Statement:** The net outward flux of a vector field through a closed surface is equal to the integral of the divergence of the field over the volume enclosed by that surface.",
        "**Analogy (Gas/Fluid):** The accumulated local expansion (integral of divergence) inside a volume equals the total measure of 'stuff' crossing the boundary (flux).",
        {
          "title": "Applications and Significance",
          "details": [
            "Vital in physics for analyzing fluid flow and heat transfer.",
            "**Electrostatics:** Forms the basis of Gauss's Law, relating electric flux out of a volume to the total charge inside.",
            "**Completes the Picture:** Shows how expansion/contraction (divergence) links local infinitesimal behavior to global macroscopic results (flux)."
          ]
        }
      ]
    },
    {
      "title": "Divergence and Curl: Local Field Behavior",
      "details": [
        "Divergence handles expansion/contraction (sources/sinks).",
        "Curl handles rotation/swirling (vorticity).",
        "These are diagnostic tools for a field's behavior."
      ]
    },
    {
      "title": "Stokes' Theorem (Curl-to-Circulation)",
      "details": [
        "Connects local curl (microscopic spin) to larger-scale circulation (line integral).",
        "Reveals deep connections in physical laws, e.g., Electromagnetism and Fluid Dynamics."
      ]
    }
  ]
}`
    }]
};