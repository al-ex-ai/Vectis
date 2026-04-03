import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MappingCard from './MappingCard';
import type { EntityMapping } from '@typedefs/index';

// Mock the API module
vi.mock('@services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ attributes: [] }),
    put: vi.fn().mockResolvedValue({}),
  },
}));

const baseMapping: EntityMapping = {
  id: 1,
  pipeline_id: 10,
  source_entity: 'account',
  dest_table: 'Accounts',
  mapping_config: JSON.stringify({
    columns: { accountid: 'AccountId', name: 'Name' },
    load_strategy: 'replace',
    dest_schema: 'config',
  }),
  transform_type: 'column_map',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00',
};

describe('MappingCard', () => {
  const onDelete = vi.fn();
  const onUpdate = vi.fn();
  const onToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders source and dest entity names', () => {
    render(
      <MappingCard
        mapping={baseMapping}
        pipelineId="10"
        onDelete={onDelete}
        onUpdate={onUpdate}
        onToast={onToast}
      />
    );
    expect(screen.getByText('account')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
  });

  it('shows load strategy chip', () => {
    render(
      <MappingCard
        mapping={baseMapping}
        pipelineId="10"
        onDelete={onDelete}
        onUpdate={onUpdate}
        onToast={onToast}
      />
    );
    expect(screen.getByText('replace')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    render(
      <MappingCard
        mapping={baseMapping}
        pipelineId="10"
        onDelete={onDelete}
        onUpdate={onUpdate}
        onToast={onToast}
      />
    );
    const deleteBtn = screen.getByTitle('Delete mapping');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('renders in autoExpand mode with save button', () => {
    render(
      <MappingCard
        mapping={baseMapping}
        pipelineId="10"
        onDelete={onDelete}
        onUpdate={onUpdate}
        onToast={onToast}
        autoExpand
      />
    );
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Transfer Settings')).toBeInTheDocument();
  });

  it('shows dest schema in autoExpand mode', () => {
    render(
      <MappingCard
        mapping={baseMapping}
        pipelineId="10"
        onDelete={onDelete}
        onUpdate={onUpdate}
        onToast={onToast}
        autoExpand
        pipelineSchema="dbo"
      />
    );
    const schemaInput = screen.getByDisplayValue('config');
    expect(schemaInput).toBeInTheDocument();
  });
});
