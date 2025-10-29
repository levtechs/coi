export interface Testimonial {
    author: string | "annonymous";
    text: string;
}

export const testimonials: Testimonial[] = [
    {
        author: "Perry Yu", 
        text: "Before coi, I didn’t know how to study. Using ChatGPT and rereading my notes became redundant. I got introduced to Coi Learn right before my APUSH retake, which I had previously scored poorly on. After using coi’s interactive features, I was able to drastically bring up my score, while also having time to do other things."
    }, {
        author: "annonymous",
        text: "Coi provides me and my peers an AI service that allows us to study efficiently. I’ve tried other AI platforms, but with Coi, the notecards and practice quizzes match my notes and are relevant to what we are learning, so I can easily comprehend the knowledge my teacher is trying to teach us. I got a C+ on my first biology test; however, after using coi for my next one, I got an A."
    }
]
