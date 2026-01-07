export interface Testimonial {
    author: string;
    role: string;
    text: string;
    highlights: string[];
    avatar?: string;
}

export const testimonials: Testimonial[] = [
    {
        author: "Perry Yu",
        role: "High School Student",
        text: `Before coi, I didn't know how to study. Using ChatGPT and rereading my notes became redundant. I got introduced to Coi Learn right before my APUSH retake, which I had previously scored poorly on. After using coi's interactive features, I was able to drastically bring up my score, while also having time to do other things.`,
        highlights: ["Drastically improved APUSH score", "More efficient study time", "Interactive learning features"]
    },
    {
        author: "Anonymous Student",
        role: "High School Student",
        text: `Coi provides me and my peers an AI service that allows us to study efficiently. I've tried other AI platforms, but with Coi, the notecards and practice quizzes match my notes and are relevant to what we are learning, so I can easily comprehend the knowledge my teacher is trying to teach us. I got a C+ on my first biology test; however, after using coi for my next one, I got an A.`,
        highlights: ["Improved from C+ to A", "Relevant study materials", "Better comprehension"]
    },
    {
        author: "Lev Smolsky",
        role: "Creator & Developer",
        text: `Building Coi has been about creating the study tools I wish I had during my own education. The combination of AI assistance, collaborative features, and structured learning paths addresses the real pain points students face.`,
        highlights: ["Built from personal experience", "Addresses real student needs", "Combines AI and collaboration"]
    }
]
