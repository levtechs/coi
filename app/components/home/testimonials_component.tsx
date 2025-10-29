import { testimonials } from "./testimonials";

const Testimonials = () => {
    return (
        <div className="w-full max-w-6xl z-10 py-16">
            <h2 className="text-4xl font-bold text-center mb-4 text-[var(--neutral-900)]">
                What Our Users Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {testimonials.map((testimonial, index) => (
                    <div
                        key={index}
                        className="bg-[var(--neutral-100)] border border-[var(--neutral-300)] rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
                    >
                        <p className="text-lg text-[var(--neutral-700)] mb-4 italic">
                            &ldquo;{testimonial.text}&rdquo;
                        </p>
                        <p className="text-sm font-semibold text-[var(--neutral-500)] text-right">
                            - {testimonial.author === "annonymous" ? "Anonymous" : testimonial.author}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Testimonials;
