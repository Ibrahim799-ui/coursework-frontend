const BASE_URL = "https://coursework-backend-rtd0.onrender.com/api";

const app = Vue.createApp({
    data() {
        return {
            search: "",
            person: {
                name: null,
                phone: null,
            },
            sitename: "CourseWork",
            filters: [
                { id: 1, name: "Subject", checked: true },
                { id: 2, name: "Location", checked: false },
                { id: 3, name: "Price", checked: false },
                { id: 4, name: "Availability", checked: false },
            ],
            secondary_filters: [
                { id: 1, name: "Ascending", sign: "", checked: true },
                { id: 2, name: "Descending", sign: "-", checked: false },
            ],
            lessons: [],
            allLessons: [], // cache original lessons for searching / resetting
            cart: [],
            total: 0,
        };
    },

    methods: {
        // Fetch lessons from the backend
        async fetchLessons() {
            try {
                const apiUrl = `${BASE_URL}/lessons`;
                console.log("Fetching lessons from:", apiUrl);

                const response = await fetch(apiUrl);

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                console.log("API Response Data:", data);

                // Check the data structure and assign it
                this.lessons = data;
                // keep a copy of the original list so filters/searching do not permanently mutate it
                this.allLessons = [...data];
            } catch (error) {
                console.error("Error fetching lessons:", error.message);
                alert("Failed to fetch lessons. Please try again later.");
            }
        },

        addToCart(course) {
            if (course.spaces > 0) {
                this.cart.push(course);
                this.total += course.price;
                course.spaces--;
            }
        },

        removeFromCart(course) {
            let index = this.cart.indexOf(course);
            this.cart.splice(index, 1);
            course.spaces++;
            this.total -= course.price;
        },

        resetVariable() {
            this.cart = [];
            this.total = 0;
        },

        checkout() {
            // basic validations
            if (!this.person.name || !this.person.phone) {
                alert("Please provide your full name and phone number before checkout.");
                return;
            }
            if (this.cart.length === 0) {
                alert("Your cart is empty.");
                return;
            }

            // Submit each cart item as a separate order document that matches the backend schema
            const submitPromises = this.cart.map((item) => {
                const orderDoc = {
                    lessonId: item._id || item.id,
                    name: this.person.name,
                    phone: this.person.phone,
                };
                return fetch(`${BASE_URL}/orders`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderDoc),
                }).then((res) => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                });
            });

            Promise.all(submitPromises)
                .then((responses) => {
                    console.log("All orders saved:", responses);
                    alert("Order(s) placed successfully!");
                    this.resetVariable();
                })
                .catch((error) => {
                    console.error("Error submitting order(s):", error);
                    alert("Failed to place order. Please try again later.");
                });
        },

        applyFilter() {
            let sign = this.secondary_filters.find((obj) => obj.checked).sign;
            let filter = this.filters.find((obj) => obj.checked).name.toLowerCase();

            if (filter === "availability") {
                filter = "spaces";
            }

            this.lessons = this.lessons.sort(this.dynamicSort(sign + filter));
        },

        dynamicSort(property) {
            const sortOrder = property.startsWith("-") ? -1 : 1;
            const prop = property.startsWith("-") ? property.slice(1) : property;

            return (a, b) => {
                const result = a[prop] < b[prop] ? -1 : a[prop] > b[prop] ? 1 : 0;
                return result * sortOrder;
            };
        },

        // Search lessons based on user input
        searching(event) {
            // Update the search query string
            this.search = event.target.value;
            const query = this.search.toLowerCase().trim();

            // If the query is empty, restore the original lessons list and re-apply sorting filters
            if (!query) {
                this.lessons = [...this.allLessons];
                this.applyFilter();
                return;
            }

            // Filter lessons against several key fields
            this.lessons = this.allLessons.filter((lesson) => {
                return (
                    (lesson.subject && lesson.subject.toLowerCase().includes(query)) ||
                    (lesson.location && lesson.location.toLowerCase().includes(query)) ||
                    (lesson.price !== undefined && lesson.price.toString().includes(query)) ||
                    (lesson.spaces !== undefined && lesson.spaces.toString().includes(query))
                );
            });
        },

        // Prevent numeric characters in the name field
        stopNumericInput(event) {
            const char = String.fromCharCode(event.which || event.keyCode);
            if (/\d/.test(char)) {
                event.preventDefault();
            }
        },

        // Prevent alphabetic characters in the phone field
        stopAlphabetsInput(event) {
            const char = String.fromCharCode(event.which || event.keyCode);
            if (/[A-Za-z]/.test(char)) {
                event.preventDefault();
            }
        },

        toggleMainFilter(filter) {
            this.filters.forEach((e) => (e.checked = e === filter));
            this.applyFilter();
        },

        toggleSecondaryFilter(sfilter) {
            this.secondary_filters.forEach((e) => (e.checked = e === sfilter));
            this.applyFilter();
        },
    },

    mounted() {
        // Fetch lessons when the app is mounted
        this.fetchLessons();
    },
});

app.mount("#app");
