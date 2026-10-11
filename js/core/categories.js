// `color` is a CSS variable from the categorical palette (css/styles.css). Colour follows the
// category, never its rank, so a filter never repaints a category. "General" is neutral gray.
export const categories = [
  { id: "general", label: "General", icon: "🧾", color: "var(--c-neutral)" },
  { id: "food", label: "Food & drink", icon: "🍽️", color: "var(--c1)" },
  { id: "groceries", label: "Groceries", icon: "🛒", color: "var(--c2)" },
  { id: "rent", label: "Rent & utilities", icon: "🏠", color: "var(--c3)" },
  { id: "transport", label: "Transport", icon: "🚕", color: "var(--c4)" },
  { id: "travel", label: "Travel", icon: "✈️", color: "var(--c5)" },
  { id: "entertainment", label: "Entertainment", icon: "🎬", color: "var(--c6)" },
  { id: "shopping", label: "Shopping", icon: "🛍️", color: "var(--c7)" },
  { id: "health", label: "Health", icon: "💊", color: "var(--c8)" },
];

export const categoryOf = (id) => categories.find((c) => c.id === id) ?? categories[0];
