import type { CLPosition, SortBy, SortOrder } from "../types";

export function sortPositions(
  positions: CLPosition[],
  sortBy: SortBy,
  sortOrder: SortOrder
): CLPosition[] {
  const sorted = [...positions].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortBy) {
      case 'value':
        aVal = parseFloat(a.estimatedValueUSD || '0');
        bVal = parseFloat(b.estimatedValueUSD || '0');
        break;
      case 'apr':
        aVal = parseFloat((a.estimatedAPR || '0%').replace('%', ''));
        bVal = parseFloat((b.estimatedAPR || '0%').replace('%', ''));
        break;
      case 'daily':
        aVal = a.rewardPerYearUSD ? parseFloat(a.rewardPerYearUSD) / 365.25 : 0;
        bVal = b.rewardPerYearUSD ? parseFloat(b.rewardPerYearUSD) / 365.25 : 0;
        break;
      case 'pair':
        aVal = a.pairSymbol || '';
        bVal = b.pairSymbol || '';
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
      default:
        return 0;
    }

    if (typeof aVal === 'string' || typeof bVal === 'string') {
      return 0;
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return sorted;
}

