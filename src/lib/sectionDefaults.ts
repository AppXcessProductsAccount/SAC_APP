/* ---------------------------------------------------------------------------
 * What each section looks like when nobody has filled it in.
 *
 * GENERATED from frontend/home_page_cms.json — the frontend's own seed file,
 * which mirrors the hardcoded fallbacks inside the section components. Do not
 * hand-edit: change the JSON and regenerate, or the "defaults" offered here
 * drift from what the website actually renders and an editor loads content
 * that never matched the live page.
 *
 * WHY THE ADMIN NEEDS A COPY AT ALL. The editor has no schema: it walks stored
 * JSON and draws a field per key. A section nobody has ever saved has no keys,
 * so it draws nothing, offers nothing to add, and the website quietly falls
 * back to its built-in defaults — content that is on the page and editable
 * nowhere. These payloads are what "Load website defaults" writes into the
 * form, turning the invisible fallback into real, editable content.
 *
 * Loading only ever ADDS keys that are missing. A value already saved is never
 * overwritten, so the button is safe to press on a section somebody has
 * already worked on.
 * ------------------------------------------------------------------------- */

export interface SectionDefault {
    /** Human name for the panel — "Hero Slider", not "hero". */
    name: string;
    /** The full content payload the website expects. */
    content: Record<string, unknown>;
    /**
     * Keys to delete when defaults are loaded, because this payload proves the
     * website does not read them.
     *
     * Listed per section rather than inferred as "any key not in the default":
     * a section may legitimately carry something this seed file has never heard
     * of, and deleting it on that basis would be guessing.
     */
    drops?: string[];
}

export const SECTION_DEFAULTS: Record<string, SectionDefault> = {
    "hero": {
        "name": "Hero Slider",
        "content": {
            "slides": [
                {
                    "id": 1,
                    "title": "7 Day Transformational\nJourney Program",
                    "subtitle": "A profound path to inner peace and self-realization.",
                    "image_url": "/section1_slide1.png",
                    "link": "/programs",
                    "button_text": "Join Program"
                },
                {
                    "id": 2,
                    "title": "Heart Centre Meditation\n+ Anahatha Chakra",
                    "subtitle": "Awaken your heart to unconditional love and compassion.",
                    "image_url": "/hero_slider_anahatha.png",
                    "link": "/programs",
                    "button_text": "Explore Meditation"
                },
                {
                    "id": 3,
                    "title": "Kundalini Yoga Meditation\n+ Ajna Chakra",
                    "subtitle": "Unlock the spiritual energy within and sharpen your intuition.",
                    "image_url": "/hero_slider_kundalini.png",
                    "link": "/programs",
                    "button_text": "Learn More"
                },
                {
                    "id": 4,
                    "title": "Free Online Preview",
                    "subtitle": "Experience the essence of our teachings from anywhere.",
                    "image_url": "/hero_slider_preview.png",
                    "link": "/programs#preview",
                    "button_text": "Watch Now"
                }
            ]
        },
        "drops": [
            "title",
            "subtitle",
            "buttonText",
            "button_text"
        ]
    },
    "section2": {
        "name": "7 Day Transformational Journey",
        "content": {
            "background_image_url": "/testimonial.png",
            "title": "7 Day Transformational Journey",
            "text": "A life-changing program designed to help you discover your inner peace and spiritual potential. Watch our promo video to learn more about the journey that awaits you.",
            "youtube_url": "https://www.youtube.com/embed/sGtx4XfL76I",
            "testimonial": {
                "text": "This journey has completely redefined my perspective on life. The peace I found here is something I carry with me every single day. Truly transformational!",
                "author": "Sarah Ahmed",
                "role": "7DTJ Graduate"
            },
            "group_meditation": {
                "title": "Group Meditation",
                "description": "Join our weekly sessions to experience the collective energy of collective consciousness and deep silence.",
                "image_url": "/event_meditation.png"
            }
        }
    },
    "upcoming-programs": {
        "name": "Upcoming Programs",
        "content": {
            "background_image_url": "/testimonial.png",
            "title": "Upcoming Programs",
            "subtitle": "Join our transformative journeys and experience profound spiritual growth across various locations.",
            "programs": [
                {
                    "id": 1,
                    "title": "Self Awareness Workshop",
                    "date_text": "May 15–17, 2024",
                    "image_url": "/event_workshop.png",
                    "tags": [
                        "Spirituality",
                        "Self-Growth"
                    ],
                    "location": "Kuala Lumpur"
                },
                {
                    "id": 2,
                    "title": "Full Moon Meditation",
                    "date_text": "June 3, 2024",
                    "image_url": "/event_meditation.png",
                    "tags": [
                        "Meditation",
                        "Wellness"
                    ],
                    "location": "Singapore"
                },
                {
                    "id": 3,
                    "title": "Jungle Retreat",
                    "date_text": "June 20–23, 2024",
                    "image_url": "/event_retreat.png",
                    "tags": [
                        "Nature",
                        "Retreat"
                    ],
                    "location": "Penang"
                }
            ]
        }
    },
    "enlightenment": {
        "name": "Enlightenment",
        "content": {
            "background_image_url": "/testimonial.png",
            "label": "Wisdom & Knowledge",
            "title": "Your Life's Destiny is\nin your Hands!",
            "content": "Experience the profound wisdom of Guru Paranjothi Subramaniam as he reveals how you can shape your own destiny through the power of self-awareness and meditation. Enlightenment is the ultimate freedom from emotional attachments.",
            "video_url": "https://www.youtube.com/embed/sGtx4XfL76I",
            "founder_name": "Yogi Dr. Pradeep Ullal",
            "founder_role": "Spiritual Scientist"
        }
    },
    "testimonials": {
        "name": "Voices of Serenity",
        "content": {
            "background_image_url": "/testimonial.png",
            "title": "Voices of Serenity",
            "subtitle": "Practitioner Stories",
            "testimonials": [
                {
                    "author_name": "John Doe",
                    "author_role": "London, UK",
                    "quote": "The 7 Day Transformational Journey completely shifted my perspective. I finally understood what it means to be truly at peace with myself."
                },
                {
                    "author_name": "Amara Singh",
                    "author_role": "Singapore",
                    "quote": "Heart Centre Meditation helped me release emotional burdens I had been carrying for years. The Anahatha Chakra activation was a profound experience."
                },
                {
                    "author_name": "Lee Wei",
                    "author_role": "Malaysia",
                    "quote": "Kundalini Yoga here is taught with such clarity and depth. My focus and mental clarity have improved tremendously since I started."
                }
            ]
        }
    },
    "faq": {
        "name": "Frequently Asked Questions",
        "content": {
            "background_image_url": "/testimonial.png",
            "title": "Frequently Asked Questions",
            "subtitle": "GET ANSWERS",
            "faqs": [
                {
                    "question": "What is the 7 Day Transformational Journey?",
                    "answer": "A comprehensive program designed to guide individuals through deep self-discovery and spiritual growth using meditation and wisdom teachings."
                },
                {
                    "question": "Can beginners join these programs?",
                    "answer": "Absolutely! Our programs are designed for all levels, from beginners looking to start their meditation journey to advanced practitioners seeking deeper insights."
                },
                {
                    "question": "Is there a free trial or preview available?",
                    "answer": "Yes, we offer a Free Online Preview session where you can experience our teachings and meditation techniques before committing to a full program."
                },
                {
                    "question": "Where are the centers located?",
                    "answer": "We have our HQ in Singapore and multiple branches across Malaysia. You can find detailed address information in our Contact section."
                },
                {
                    "question": "How do I start with Kundalini Yoga?",
                    "answer": "You can sign up for our introductory Kundalini Yoga workshop which focuses on the Ajna Chakra and awakening the vital energy within."
                }
            ]
        }
    },
};
