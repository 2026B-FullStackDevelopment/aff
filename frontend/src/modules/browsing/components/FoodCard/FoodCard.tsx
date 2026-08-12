import { Button } from '@/shared/components/Button/Button';
import { StatusBadge } from '@/shared/components/StatusBadge/StatusBadge';
import { useFoodCard } from './useFoodCard';

export interface FoodItem {
  id?: string;
  title: string;
  description: string;
  status: string;
  price: number;
}

interface FoodCardProps {
  food: FoodItem;
}

export function FoodCard({ food }: FoodCardProps) {
  const { reserveFood } = useFoodCard(food);

  return (
    <article className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 flex flex-col justify-between gap-4 group">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800 group-hover:text-[#3D6852] transition-colors duration-200 leading-snug">
            {food.title}
          </h2>
          <StatusBadge status={food.status} />
        </div>
        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {food.description}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-base font-extrabold text-[#3D6852]">
          {food.price === 0 ? 'Free' : `$${food.price}`}
        </span>
        <Button
          onClick={reserveFood}
          className="bg-[#3D6852] hover:bg-[#2E5A47] active:scale-[0.98] text-white font-semibold px-4 h-9 rounded-lg text-xs transition-all duration-200 ease-out hover:shadow-sm"
        >
          Reserve
        </Button>
      </div>
    </article>
  );
}

export default FoodCard;
