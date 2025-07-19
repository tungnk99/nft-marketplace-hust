
import React from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Search, Filter } from 'lucide-react';

export interface FilterOptions {
  search: string;
  category: string;
  listingStatus?: string;
}

interface FilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onResetFilters: () => void;
  showListingStatus?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  filters, 
  onFiltersChange, 
  onResetFilters, 
  showListingStatus = false 
}) => {
  const updateFilter = (key: keyof FilterOptions, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${showListingStatus ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {/* Search by name */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filter */}
          <Select value={filters.category} onValueChange={(value) => updateFilter('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Art">Art</SelectItem>
              <SelectItem value="Music">Music</SelectItem>
              <SelectItem value="Game">Game</SelectItem>
              <SelectItem value="Collectibles">Collectibles</SelectItem>
              <SelectItem value="Photography">Photography</SelectItem>
            </SelectContent>
          </Select>

          {/* Listing status filter - only show if enabled */}
          {showListingStatus && (
            <Select value={filters.listingStatus || 'all'} onValueChange={(value) => updateFilter('listingStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="listed">Listed</SelectItem>
                <SelectItem value="not-listed">Not Listed</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Reset button */}
          <Button variant="outline" onClick={onResetFilters} className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Reset Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterBar;
