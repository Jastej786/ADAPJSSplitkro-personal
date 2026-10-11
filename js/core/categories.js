export const categories = [
  { id: "general", label: "General", icon: "🧾" },
  { id: "food", label: "Food & drink", icon: "🍽️" },
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "rent", label: "Rent & utilities", icon: "🏠" },
  { id: "transport", label: "Transport", icon: "🚕" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "entertainment", label: "Entertainment", icon: "🎬" },
  { id: "shopping", label: "Shopping", icon: "🛍️" },
  { id: "health", label: "Health", icon: "💊" },
];

export const categoryOf = (id) => categories.find((c) => c.id === id) ?? categories[0];
