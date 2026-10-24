/** 같은 몸 기준점을 공유하는 계절별 디자인. */
export const OUTFIT_VARIANTS: Record<string, string> = {
  "spring-flower-shirt": "shirt",
  "spring-mint-knit": "sweater",
  "spring-lavender-pants": "chinos",
  "spring-yellow-cardigan": "pink-cardigan",
  "summer-ocean-shirt": "shirt",
  "summer-watermelon-shirt": "shirt",
  "summer-coral-shorts": "summer-shorts",
  "summer-sky-jacket": "jacket",
  "autumn-burgundy-knit": "sweater",
  "autumn-check-top": "sweater",
  "autumn-brown-cargo": "cargo-pants",
  "autumn-cream-jacket": "denim-jacket",
  "winter-snow-knit": "sweater",
  "winter-red-knit": "sweater",
  "winter-gray-pants": "pants",
  "winter-camel-coat": "winter-coat"
};
export const outfitBase = (id: string) => OUTFIT_VARIANTS[id] ?? id;
