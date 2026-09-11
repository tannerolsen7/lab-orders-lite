"use client";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

export type Column<T> = {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  rowClassName,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col, i) => (
            <TableHead key={i}>{col.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.id}
            className={cn(
              onRowClick && "cursor-pointer",
              rowClassName?.(row)
            )}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col, i) => (
              <TableCell key={i}>
                {col.cell
                  ? col.cell(row)
                  : col.accessorKey
                    ? String(row[col.accessorKey] ?? "")
                    : null}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
