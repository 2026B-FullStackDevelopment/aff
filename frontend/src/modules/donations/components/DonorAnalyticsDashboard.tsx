import type { LucideIcon } from 'lucide-react';
import {
  BadgeDollarSign,
  ClipboardList,
  PackageCheck,
  Radio,
} from 'lucide-react';
import { Panel } from '@/shared/components/Panel/Panel';
import type {
  DonorAnalyticsCategory,
  DonorAnalyticsSnapshot,
} from '../types';

interface DonorAnalyticsDashboardProps {
  snapshot: DonorAnalyticsSnapshot;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface CategoryChartProps {
  title: string;
  description: string;
  categories: DonorAnalyticsCategory[];
  valueSelector: (
    category: DonorAnalyticsCategory,
  ) => number;
  valueFormatter: (value: number) => string;
}

const currencyFormatter =
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  });

const compactNumberFormatter =
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });

function formatCurrency(
  value: number,
): string {
  return `${currencyFormatter.format(value)} VND`;
}

function formatCompactCurrency(
  value: number,
): string {
  return `${compactNumberFormatter.format(value)} VND`;
}

function formatCategoryLabel(category: DonorAnalyticsCategory['category']): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-[#E4E2E1] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#616762]">
            {label}
          </p>

          <p className="mt-3 break-words text-3xl font-bold text-[#414844]">
            {value}
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF6E3] text-[#805300]">
          <Icon
            className="size-5"
            aria-hidden="true"
          />
        </div>
      </div>
    </article>
  );
}

function CategoryChart({
  title,
  description,
  categories,
  valueSelector,
  valueFormatter,
}: CategoryChartProps) {
  const maximumValue = Math.max(
    ...categories.map(valueSelector),
    0,
  );

  return (
    <Panel
      title={title}
      description={description}
      className="shadow-sm"
      contentClassName="overflow-x-auto"
    >
      <div className="min-w-[560px]">
        <div
          className="grid h-64 items-end gap-4 border-b border-[#E4E2E1] px-3"
          style={{
            gridTemplateColumns:
              `repeat(${categories.length}, minmax(0, 1fr))`,
          }}
        >
          {categories.map(
            (category, index) => {
              const value =
                valueSelector(category);

              const height =
                maximumValue > 0
                  ? Math.max(
                    (value / maximumValue) * 100,
                    value > 0 ? 5 : 0,
                  )
                  : 0;

              return (
                <div
                  key={category.category}
                  className="flex h-full flex-col items-center justify-end"
                >
                  <span className="mb-2 text-xs font-semibold text-[#414844]">
                    {valueFormatter(value)}
                  </span>

                  <div
                    className={
                      index % 2 === 0
                        ? 'w-full max-w-14 rounded-t-md bg-[#805300]'
                        : 'w-full max-w-14 rounded-t-md bg-[#F3A000]'
                    }
                    style={{
                      height: `${height}%`,
                    }}
                    role="img"
                    aria-label={
                      `${formatCategoryLabel(category.category)}: ${valueFormatter(value)}`
                    }
                  />
                </div>
              );
            },
          )}
        </div>

        <div
          className="grid gap-4 px-3 pt-3"
          style={{
            gridTemplateColumns:
              `repeat(${categories.length}, minmax(0, 1fr))`,
          }}
        >
          {categories.map((category) => (
            <span
              key={category.category}
              className="text-center text-xs font-medium text-[#616762]"
            >
              {formatCategoryLabel(category.category)}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

export function DonorAnalyticsDashboard({
  snapshot,
}: DonorAnalyticsDashboardProps) {
  const highestListingRevenue =
    Math.max(
      ...snapshot.topListings.map(
        (listing) => listing.revenue,
      ),
      0,
    );

  return (
    <div className="space-y-6">
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Donor analytics summary"
      >
        <MetricCard
          label="Total Revenue"
          value={formatCompactCurrency(
            snapshot.totalRevenue,
          )}
          icon={BadgeDollarSign}
        />

        <MetricCard
          label="Total Listings"
          value={String(
            snapshot.totalListings,
          )}
          icon={ClipboardList}
        />

        <MetricCard
          label="Current Listings"
          value={String(
            snapshot.currentListings,
          )}
          icon={Radio}
        />

        <MetricCard
          label="Sold-Out Listings"
          value={String(
            snapshot.soldOutListings,
          )}
          icon={PackageCheck}
        />
      </section>

      <section
        className="grid gap-6 xl:grid-cols-2"
        aria-label="Category analytics"
      >
        <CategoryChart
          title="Listings by Category"
          description="The number of current and past listings in each food category."
          categories={snapshot.categories}
          valueSelector={
            (category) =>
              category.listingCount
          }
          valueFormatter={
            (value) => String(value)
          }
        />

        <CategoryChart
          title="Revenue by Category"
          description="Paid order revenue reported by your listings."
          categories={snapshot.categories}
          valueSelector={
            (category) =>
              category.revenue
          }
          valueFormatter={
            formatCompactCurrency
          }
        />
      </section>

      <section
        className="grid gap-6 xl:grid-cols-2"
        aria-label="Listing impact details"
      >
        <Panel
          title="Top Listings by Revenue"
          description="Your five highest-revenue listings."
          className="shadow-sm"
        >
          <ol className="space-y-5">
            {snapshot.topListings.map(
              (listing, index) => {
                const width =
                  highestListingRevenue > 0
                    ? (
                      listing.revenue
                      / highestListingRevenue
                    ) * 100
                    : 0;

                return (
                  <li
                    key={listing.id}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#805300]">
                          #{index + 1}
                        </span>

                        <span className="truncate text-sm font-semibold text-[#414844]">
                          {listing.name}
                        </span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#F1EFED]">
                        <div
                          className={
                            index % 2 === 0
                              ? 'h-full rounded-full bg-[#805300]'
                              : 'h-full rounded-full bg-[#F3A000]'
                          }
                          style={{
                            width: `${width}%`,
                          }}
                          role="img"
                          aria-label={
                            `${listing.name}: ${formatCurrency(listing.revenue)}`
                          }
                        />
                      </div>
                    </div>

                    <span className="self-end whitespace-nowrap text-sm font-semibold text-[#414844]">
                      {formatCurrency(
                        listing.revenue,
                      )}
                    </span>
                  </li>
                );
              },
            )}
          </ol>
        </Panel>

        <Panel
          title="Category Breakdown"
          description="Listing count and revenue grouped by food category."
          className="shadow-sm"
          contentClassName="overflow-x-auto p-0"
        >
          <table className="w-full min-w-[480px] border-collapse text-left">
            <thead className="bg-[#FFF6E3]">
              <tr>
                <th
                  scope="col"
                  className="px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#5B3A00]"
                >
                  Category
                </th>

                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-[#5B3A00]"
                >
                  Listings
                </th>

                <th
                  scope="col"
                  className="px-5 py-3 text-right text-xs font-bold uppercase tracking-[0.08em] text-[#5B3A00]"
                >
                  Revenue
                </th>
              </tr>
            </thead>

            <tbody>
              {snapshot.categories.map(
                (category) => (
                  <tr
                    key={category.category}
                    className="border-t border-[#E4E2E1]"
                  >
                    <th
                      scope="row"
                      className="px-5 py-4 text-sm font-semibold text-[#414844]"
                    >
                      {formatCategoryLabel(category.category)}
                    </th>

                    <td className="px-5 py-4 text-right text-sm text-[#414844]">
                      {category.listingCount}
                    </td>

                    <td className="px-5 py-4 text-right text-sm font-semibold text-[#414844]">
                      {formatCurrency(
                        category.revenue,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </Panel>
      </section>
    </div>
  );
}

export default DonorAnalyticsDashboard;
