// Presents one food listing card and delegates behavior to useFoodCard.
import { Button } from '../../../../shared/components/Button/Button.jsx';
import { StatusBadge } from '../../../../shared/components/StatusBadge/StatusBadge.jsx';
import { useFoodCard } from './useFoodCard.js';
import './FoodCard.css';

export function FoodCard({ food }) {
  const { reserveFood } = useFoodCard(food);

  return (
    <article className="food-card">
      <h2>{food.title}</h2>
      <p>{food.description}</p>
      <StatusBadge status={food.status} />
      <p>{food.price === 0 ? 'Free' : `$${food.price}`}</p>
      <Button onClick={reserveFood}>Reserve</Button>
    </article>
  );
}
