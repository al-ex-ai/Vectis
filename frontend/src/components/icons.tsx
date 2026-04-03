import { SvgIcon } from '@mui/material';
import type { SvgIconProps } from '@mui/material';

/* ── Navigation icons (Vectis-specific designs) ── */

/** Home — compass/dashboard dial */
export function HomeIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <path d="M14.5 9.5l-5 5 2-5 3 0z" fill="currentColor" opacity="0.7" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </SvgIcon>
  );
}

/** Projects — stacked hexagonal cells */
export function ProjectsIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M12 2l6 3.5v7L12 16 6 12.5v-7L12 2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6 12.5l6 3.5 6-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" />
      <path d="M6 16l6 3.5 6-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.3" />
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </SvgIcon>
  );
}

/** Connections — plug/socket with energy arc */
export function ConnectionsIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <rect x="2" y="8" width="7" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="15" y="8" width="7" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="5.5" cy="12" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="18.5" cy="12" r="1" fill="currentColor" opacity="0.5" />
    </SvgIcon>
  );
}

/** Dashboard — speed gauge with needle */
export function DashboardIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M4 18a8 8 0 1116 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="18" x2="15" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="18" r="2" fill="currentColor" opacity="0.4" />
      <path d="M7 16.5l-1 1M17 16.5l1 1M12 7v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </SvgIcon>
  );
}

/** Pipelines — horizontal tube with data particles */
export function PipelinesIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M2 9h20M2 15h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M2 9v6M22 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7" cy="12" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.5" />
      <circle cx="17" cy="12" r="1.5" fill="currentColor" opacity="0.3" />
      <polyline points="19,10.5 21,12 19,13.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </SvgIcon>
  );
}

/** Flows — branching river/stream */
export function FlowsIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="4" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="20" cy="6" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="20" cy="18" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.5 11 C10 8, 14 6, 17.5 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M6.5 13 C10 16, 14 18, 17.5 18" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </SvgIcon>
  );
}

/** Runs — activity pulse/heartbeat monitor */
export function RunsIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <polyline points="6,14 9,14 10.5,8 12.5,18 14.5,11 16,14 18,14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

/** Schema — ER diagram: three connected table shapes */
export function SchemaIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <rect x="1" y="2" width="9" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="1" y1="4.5" x2="10" y2="4.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <rect x="14" y="2" width="9" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="14" y1="4.5" x2="23" y2="4.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <rect x="7" y="16" width="10" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="7" y1="18.5" x2="17" y2="18.5" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      <path d="M5.5 8v4L10 16" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeDasharray="2.5 2" />
      <path d="M18.5 8v4L14 16" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeDasharray="2.5 2" />
    </SvgIcon>
  );
}

/* ── Action / utility icons ── */

export function PlusIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function BackIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <polyline points="10,7 5,12 10,17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function TrashIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polyline points="3,6 5,6 21,6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function EditPenIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function PlayIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polygon points="6,4 20,12 6,20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function SaveIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <polyline points="17,21 17,13 7,13 7,21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="7,3 7,8 15,8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function SearchIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function RefreshIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polyline points="1,4 1,10 7,10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.51 15a9 9 0 102.13-9.36L1 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function FilterIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polygon points="3,4 21,4 14,13 14,20 10,22 10,13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function ChevronLeftIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polyline points="15,6 9,12 15,18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function ChevronDownIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polyline points="6,9 12,15 18,9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function MenuIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function SunIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="2" x2="12" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="2" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function MoonIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function LogoutIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16,17 21,12 16,7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function PaletteIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8" cy="9" r="1.3" fill="currentColor" opacity="0.7" />
      <circle cx="12" cy="7" r="1.3" fill="currentColor" opacity="0.7" />
      <circle cx="16" cy="9" r="1.3" fill="currentColor" opacity="0.7" />
      <circle cx="16.5" cy="13" r="1.3" fill="currentColor" opacity="0.7" />
      <path d="M10 14 C10 17 8 18 8 18 C8 18 12 19 12 16 C12 14 10 14 10 14Z" fill="currentColor" opacity="0.5" />
    </SvgIcon>
  );
}

/** Copy — clipboard outline */
export function CopyIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <rect x="9" y="9" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 15V5a2 2 0 012-2h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgIcon>
  );
}

/** Users — person with group silhouette */
export function UsersIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19" cy="7" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
      <path d="M21 21v-1.5a3 3 0 00-3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
    </SvgIcon>
  );
}

/** Schedule — clock with cron tick marks */
export function ScheduleIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="12" y1="6" x2="12" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="12" x2="16" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="3" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="21" y1="12" x2="19.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="12" y1="21" x2="12" y2="19.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      <line x1="3" y1="12" x2="4.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </SvgIcon>
  );
}

/* ── ReactFlow canvas icons ── */

export function ZoomInIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10.5" y1="7.5" x2="10.5" y2="13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function ZoomOutIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="15.5" y1="15.5" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </SvgIcon>
  );
}

export function FitViewIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polyline points="15,3 21,3 21,9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9,21 3,21 3,15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="21,15 21,21 15,21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="3,9 3,3 9,3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}

export function MinimapIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
      <rect x="5" y="5" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3" />
    </SvgIcon>
  );
}

/* ── Additional icons used by PipelineDetail / SchemaExplorer ── */

export function ArrowRightIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><polyline points="14,7 19,12 14,17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>);
}

export function CheckCircleIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><polyline points="8,12 11,15 16,9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>);
}

export function CloseIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></SvgIcon>);
}

export function ChevronUpIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><polyline points="6,15 12,9 18,15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>);
}

export function ChevronRightIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><polyline points="9,6 15,12 9,18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>);
}

export function DatabaseIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="8" ry="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" fill="none" stroke="currentColor" strokeWidth="1.8" opacity="0.4" /></SvgIcon>);
}

export function TableIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.6" /><line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.6" /><line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="1.6" /></SvgIcon>);
}

export function ShieldCheckIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><path d="M12 2l7 4v5c0 5.25-3.5 9.74-7 11-3.5-1.26-7-5.75-7-11V6l7-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><polyline points="8.5,12 11,14.5 15.5,9.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>);
}

export function EyeIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" /></SvgIcon>);
}

export function WarningIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="16.5" r="0.8" fill="currentColor" /></SvgIcon>);
}

export function ErrorCircleIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></SvgIcon>);
}

export function GearIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></SvgIcon>);
}

export function HelpIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M9 9a3 3 0 1 1 3.5 2.96c-.5.2-.5.54-.5 1.04" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="12" cy="17" r="0.8" fill="currentColor" /></SvgIcon>);
}

export function TreeIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><circle cx="12" cy="4" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="6" cy="14" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="18" cy="14" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="20" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><line x1="12" y1="6" x2="6" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><line x1="12" y1="6" x2="18" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><line x1="6" y1="16" x2="12" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></SvgIcon>);
}

export function MotionIcon(props: SvgIconProps) {
  return (<SvgIcon {...props} viewBox="0 0 24 24"><path d="M2 12 Q5 4, 8 12 T14 12 T20 12 T22 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></SvgIcon>);
}

/** Vectis logo — stylized V formed by two converging data streams meeting at a point and flowing out */
export function VectisIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Left stream — curves down to center forming left side of V */}
      <path d="M3 4 C5 4, 7 8, 9 12 C10 14, 11 16, 12 19" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Right stream — curves down to center forming right side of V */}
      <path d="M21 4 C19 4, 17 8, 15 12 C14 14, 13 16, 12 19" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Data particles on left stream */}
      <circle cx="5" cy="6" r="1.4" fill="currentColor" opacity="0.8" />
      <circle cx="8" cy="10.5" r="1.2" fill="currentColor" opacity="0.5" />
      {/* Data particles on right stream */}
      <circle cx="19" cy="6" r="1.4" fill="currentColor" opacity="0.8" />
      <circle cx="16" cy="10.5" r="1.2" fill="currentColor" opacity="0.5" />
      {/* Convergence point glow */}
      <circle cx="12" cy="19" r="2" fill="currentColor" opacity="0.3" />
    </SvgIcon>
  );
}
