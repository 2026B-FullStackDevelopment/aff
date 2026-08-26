import type { FoodCategory } from "@/types/api";

export const CATEGORY_OPTIONS: { label: string; value: FoodCategory }[] = [
  { label: 'Fruit', value: 'FRUIT' },
  { label: 'Vegetable', value: 'VEGETABLE' },
  { label: 'Meat', value: 'MEAT' },
  { label: 'Cooked Dish', value: 'COOKED_DISH' },
  { label: 'Baked Goods', value: 'BAKED_GOODS' },
  { label: 'Drink', value: 'DRINK' },
];
