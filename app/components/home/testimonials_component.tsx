import { testimonials } from "./testimonials";


const Testimonials = () => {
    return (
        <section className="py-20 bg-[var(--neutral-500)]/20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-bold text-[var(--neutral-900)] mb-6">
                        Trusted by Students Worldwide
                    </h2>

                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className="bg-[var(--neutral-300)] rounded-xl p-8 shadow-lg border border-[var(--neutral-300)] hover:shadow-xl transition-shadow"
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-[var(--accent-500)] rounded-full flex items-center justify-center text-white font-bold text-xl">
                                    {testimonial.author.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--neutral-900)]">{testimonial.author}</h3>
                                    <p className="text-sm text-[var(--neutral-600)]">{testimonial.role}</p>
                                </div>
                            </div>

                             <p className="text-[var(--neutral-700)] mb-6 italic leading-relaxed">
                                 &ldquo;{testimonial.text}&rdquo;
                             </p>

                            <div className="space-y-2">
                                {testimonial.highlights.map((highlight, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-[var(--accent-500)] rounded-full"></div>
                                        <span className="text-sm text-[var(--neutral-600)]">{highlight}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
