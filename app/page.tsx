"use client";

import jsQR from "jsqr";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type Health = "Healthy" | "Warning" | "Offline" | "Pending" | "Online";
type Tone = "blue" | "green" | "amber" | "red" | "purple" | "slate";

type NavItem = {
  label: string;
  icon: string;
  count?: number;
};

type Metric = {
  label: string;
  value: string;
  delta: string;
  icon: string;
};

type Alert = {
  label: string;
  detail: string;
  count: number;
};

type Rack = {
  name: string;
  row: string;
  used: number;
  total: number;
  power: number;
  cooling: Health;
};

type Activity = {
  title: string;
  time: string;
  icon: string;
  tone: Tone;
};

type Technician = {
  name: string;
  task: string;
  status: Health;
};

type ServiceDeskProvider = {
  name: string;
  icon: string;
  detail: string;
  status: "Ready" | "Planned";
};

type SystemHealthStatus = "Enabled" | "Partial" | "Disabled";

type SettingsControl = {
  label: string;
  detail: string;
  value: string;
  status: SystemHealthStatus;
};

type IntegrationProvider = {
  name: string;
  icon: string;
  category: string;
  detail: string;
  status: "Not Connected" | "Ready to Connect" | "Planned";
  fields: string[];
  nextStep: string;
};

type AuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  source: string;
  severity: "Info" | "Warning" | "Critical";
  detail: string;
};

type FiberSignalResult = {
  color: "red" | "white" | "purple";
  score: number;
  wavelengthHint?: string;
};

type Scan = {
  title: string;
  detail: string;
  time: string;
  tone: Tone;
};

type OfflineDevice = {
  title: string;
  detail: string;
  status: Health;
};

type QuickActionId = "scan" | "rack-audit" | "print-labels" | "work-order" | "fiber-test" | "import-assets";

type QuickAction = {
  id: QuickActionId;
  title: string;
  detail: string;
  icon: string;
  tone: Tone;
};

type AssetStatus = "Active" | "In Service" | "In Stock" | "Maintenance" | "Offline" | "Retired";

type AssetRecord = {
  id: string;
  qrCode: string;
  assetType: string;
  name: string;
  serial: string;
  status: AssetStatus;
  site: string;
  room: string;
  rack: string;
  ruPosition: string;
  ipAddress: string;
  macAddress: string;
  vlan: string;
  switchPort: string;
  cableType: string;
  length: string;
  connectorType: string;
  from: string;
  to: string;
  notes: string;
  tags: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
};

type AssetCategory = "Cables" | "GBICs" | "Servers" | "Other";

type AssetDatabaseApi = {
  getAll: () => Promise<AssetRecord[]>;
  put: (asset: AssetRecord) => Promise<void>;
  getById: (id: string) => Promise<AssetRecord | null>;
};

type ImportedAssetRow = Record<string, unknown>;

type BarcodeDetectorResult = {
  rawValue: string;
};

type BarcodeDetectorApi = {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorApi;

type RackHealth = "Healthy" | "Warning" | "Critical";
type DeviceStatus = "Online" | "Warning" | "Offline";
type DeviceKind = "Switch" | "Server" | "Patch Panel" | "Storage" | "PDU" | "UPS";
type CableKind = "Fiber" | "DAC" | "Copper";

type RackDevice = {
  id: string;
  hostname: string;
  kind: DeviceKind;
  ip: string;
  serial: string;
  startU: number;
  heightU: number;
  status: DeviceStatus;
  qrId: string;
  vlans: string[];
  ports: RackPort[];
  lastUpdated: string;
  technician: string;
};

type RackPort = {
  id: string;
  label: string;
  connector: "MPO" | "LC" | "QSFP" | "SFP" | "RJ45";
  cableId?: string;
};

type RackCable = {
  id: string;
  fromDevice: string;
  fromPort: string;
  toDevice: string;
  toPort: string;
  type: CableKind;
  connector: "MPO" | "LC" | "QSFP" | "SFP" | "RJ45";
  destination: string;
};

type RackRecord = {
  id: string;
  name: string;
  site: string;
  room: string;
  row: string;
  health: RackHealth;
  temperature: number;
  powerKw: number;
  powerCapacityKw: number;
  cableCount: number;
  devices: RackDevice[];
  cables: RackCable[];
  qrAssets: string[];
};

type CableInventoryStatus = "In Stock" | "Low Stock" | "Reserved" | "Deployed" | "Quarantine";
type CableInventoryCategory = CableKind | "Transceiver";

type CableInventoryItem = {
  id: string;
  sku: string;
  category: CableInventoryCategory;
  type: string;
  vendor: string;
  length: string;
  connector: string;
  speed: string;
  quantity: number;
  minimum: number;
  location: string;
  bin: string;
  status: CableInventoryStatus;
  owner: string;
  lastCounted: string;
  notes: string;
};

const navItems: NavItem[] = [
  { label: "Command", icon: "H" },
  { label: "QR Studio", icon: "Q" },
  { label: "Assets", icon: "A" },
  { label: "Tickets", icon: "SD" },
  { label: "Technicians", icon: "T" },
  { label: "Racks", icon: "R" },
  { label: "Cables", icon: "C" },
  { label: "Map", icon: "M" },
  { label: "Reports", icon: "P" }
];

const systemItems = ["Settings", "Integrations", "Audit Logs"];

const metrics: Metric[] = [
  { label: "Assets", value: "1,246", delta: "12 new", icon: "BX" },
  { label: "Devices", value: "229", delta: "5 new", icon: "SV" },
  { label: "Racks", value: "42", delta: "82% avg. used", icon: "RK" },
  { label: "Cables", value: "3,782", delta: "28 new", icon: "CB" },
  { label: "Tickets", value: "Ready", delta: "Jira / ServiceNow prep", icon: "TK" },
  { label: "Technicians", value: "6", delta: "3 on site", icon: "TE" }
];

const alerts: Alert[] = [
  { label: "Orphan Cables", detail: "Unassigned or not connected", count: 12 },
  { label: "Unlabeled Assets", detail: "Missing QR or asset tag", count: 3 },
  { label: "Pending Scans", detail: "Scans not synced yet", count: 8 },
  { label: "Duplicate QR Codes", detail: "Require review", count: 2 },
  { label: "Sync Conflicts", detail: "Resolve before sync", count: 4 }
];

const racks: Rack[] = [
  { name: "DC-A12", row: "Leaf Switch Row", used: 34, total: 42, power: 71, cooling: "Healthy" },
  { name: "DC-B07", row: "Core Row", used: 28, total: 42, power: 65, cooling: "Healthy" },
  { name: "DC-C03", row: "Compute Row", used: 39, total: 42, power: 89, cooling: "Warning" },
  { name: "DC-A01", row: "Storage Row", used: 19, total: 42, power: 48, cooling: "Healthy" }
];

const liveActivity: Activity[] = [
  { title: "Sean scanned Rack DC-A12", time: "Just now", icon: "SC", tone: "green" },
  { title: "Fiber LC-LC assigned to SW-LEAF-02", time: "1 min ago", icon: "LN", tone: "blue" },
  { title: "QR label printed for 24 assets", time: "3 min ago", icon: "QR", tone: "purple" },
  { title: "Device moved from Rack B12 to C07", time: "5 min ago", icon: "MV", tone: "amber" },
  { title: "Offline sync completed", time: "7 min ago", icon: "SY", tone: "green" },
  { title: "Technician David linked ticket TK-1254", time: "8 min ago", icon: "TK", tone: "blue" },
  { title: "Signal test failed on Fiber-221", time: "11 min ago", icon: "AL", tone: "red" }
];

const technicians: Technician[] = [
  { name: "David M.", task: "Rack Audit", status: "Online" },
  { name: "Alex R.", task: "Fiber Validation", status: "Online" },
  { name: "Sean P.", task: "QR Deployment", status: "Online" },
  { name: "Mike T.", task: "Break/Fix", status: "Offline" },
  { name: "Jordan L.", task: "Inventory Scan", status: "Pending" },
  { name: "Chris B.", task: "Site Survey", status: "Offline" }
];

const serviceDeskProviders: ServiceDeskProvider[] = [
  { name: "ServiceNow", icon: "SN", detail: "Incident / task sync placeholder", status: "Ready" },
  { name: "Jira", icon: "JR", detail: "Issue / JSM request placeholder", status: "Ready" },
  { name: "Other", icon: "OT", detail: "Webhook or custom API placeholder", status: "Planned" }
];

const settingsControls: SettingsControl[] = [
  { label: "Asset ID Prefix", detail: "Default QR/RFID identity format", value: "PP-000000", status: "Enabled" },
  { label: "Label Print Size", detail: "Optimized for label printers", value: "50mm QR only", status: "Enabled" },
  { label: "Unknown QR Flow", detail: "Ask before creating a new asset", value: "Confirm + Draft", status: "Enabled" },
  { label: "Offline Database", detail: "Local IndexedDB registry for field work", value: "Browser local DB", status: "Enabled" },
  { label: "Excel Import Mapping", detail: "English and Hebrew headers supported", value: "Auto map", status: "Enabled" },
  { label: "Supabase Sync", detail: "Cloud database connection layer", value: "Ready to configure", status: "Partial" }
];

const integrationProviders: IntegrationProvider[] = [
  {
    name: "Supabase",
    icon: "SB",
    category: "Database",
    detail: "Central asset registry, auth, audit storage, and realtime sync.",
    status: "Ready to Connect",
    fields: ["Project URL", "Anon key", "assets table", "audit_events table"],
    nextStep: "Add env vars and map AssetRecord fields to Postgres."
  },
  {
    name: "ServiceNow",
    icon: "SN",
    category: "Service Desk",
    detail: "Create or link incidents, tasks, and CMDB records from QR scans.",
    status: "Ready to Connect",
    fields: ["Instance URL", "Client ID", "Client Secret", "Assignment group"],
    nextStep: "Connect OAuth and define ticket templates."
  },
  {
    name: "Jira",
    icon: "JR",
    category: "Service Desk",
    detail: "Open Jira or JSM requests from assets, rack audits, and fiber tests.",
    status: "Ready to Connect",
    fields: ["Site URL", "Project key", "Issue type", "API token"],
    nextStep: "Choose project defaults and field mapping."
  },
  {
    name: "Other",
    icon: "OT",
    category: "Webhook",
    detail: "Generic outbound webhook for custom NOC, ERP, or automation systems.",
    status: "Planned",
    fields: ["Webhook URL", "Shared secret", "Payload template"],
    nextStep: "Define signed JSON payload and retry policy."
  }
];

const auditLogEntries: AuditLogEntry[] = [
  { id: "AUD-1042", actor: "David M.", action: "Saved asset", target: "PP-000132", time: "Just now", source: "QR Studio", severity: "Info", detail: "Unknown QR/RFID was added as a new asset draft and saved to local DB." },
  { id: "AUD-1041", actor: "Sean P.", action: "Imported spreadsheet", target: "13 rows", time: "4 min ago", source: "Assets", severity: "Info", detail: "Excel import mapped serials, IPs, racks, cable fields, and generated QR identities." },
  { id: "AUD-1040", actor: "Alex R.", action: "Fiber signal detected", target: "Fiber-221", time: "11 min ago", source: "Mobile Camera", severity: "Info", detail: "Camera validation detected a stable red/white optical signal." },
  { id: "AUD-1039", actor: "System", action: "Duplicate QR warning", target: "PP-000128", time: "18 min ago", source: "Registry", severity: "Warning", detail: "Two records matched the same QR payload and need operator review." },
  { id: "AUD-1038", actor: "Mike T.", action: "Printed QR label", target: "PP-000171", time: "27 min ago", source: "Label Printer", severity: "Info", detail: "QR-only 50mm label print was prepared from the asset record." },
  { id: "AUD-1037", actor: "System", action: "Sync unavailable", target: "Supabase", time: "43 min ago", source: "Integration Layer", severity: "Warning", detail: "Cloud sync is not configured yet; local browser DB remains active." },
  { id: "AUD-1036", actor: "David M.", action: "Opened rack audit", target: "RACK-A12", time: "1 hr ago", source: "Racks", severity: "Info", detail: "Rack workspace opened with topology, device details, and cable trace." }
];

const recentScans: Scan[] = [
  { title: "Rack DC-A12", detail: "Scanned by Sean P.", time: "Just now", tone: "green" },
  { title: "Device SW-LEAF-02", detail: "Scanned by Sean P.", time: "1 min ago", tone: "blue" },
  { title: "Cable Fiber-221", detail: "Scanned by Alex R.", time: "4 min ago", tone: "amber" },
  { title: "Rack DC-B07", detail: "Scanned by Alex R.", time: "6 min ago", tone: "green" },
  { title: "Device FW-EDGE-01", detail: "Scanned by David M.", time: "9 min ago", tone: "blue" }
];

const offlineDevices: OfflineDevice[] = [
  { title: "Mobile App - Sean", detail: "Last sync: 12 min ago", status: "Warning" },
  { title: "Mobile App - Mike", detail: "Last sync: 28 min ago", status: "Offline" },
  { title: "Scan Device - 02", detail: "Last sync: 45 min ago", status: "Warning" },
  { title: "Scan Device - 03", detail: "Last sync: 2 hrs ago", status: "Offline" }
];

const quickActions: QuickAction[] = [
  { id: "scan", title: "Scan QR Code", detail: "Identify an asset", icon: "QR", tone: "purple" },
  { id: "print-labels", title: "Create Label", detail: "Register asset", icon: "DB", tone: "slate" },
  { id: "import-assets", title: "Lookup Registry", detail: "Find by QR data", icon: "LU", tone: "blue" },
  { id: "rack-audit", title: "Start Rack Audit", detail: "Verify by QR", icon: "RA", tone: "amber" },
  { id: "work-order", title: "Create Ticket", detail: "Service desk draft", icon: "TK", tone: "green" },
  { id: "fiber-test", title: "Validate Fiber Link", detail: "Run signal test", icon: "FL", tone: "blue" }
];

const assetTypes = ["Device", "Rack", "Fiber Cable", "Copper Cable", "Patch Panel", "UPS", "PDU", "Switch", "Server", "Storage", "Other"];
const assetStatuses: AssetStatus[] = ["Active", "In Service", "In Stock", "Maintenance", "Offline", "Retired"];
const assetCategories: AssetCategory[] = ["Cables", "GBICs", "Servers", "Other"];

const rackInventory: RackRecord[] = [
  {
    id: "rack-a12",
    name: "RACK-A12",
    site: "DC1",
    room: "Room 3",
    row: "Leaf Switch Row",
    health: "Healthy",
    temperature: 21.8,
    powerKw: 7.4,
    powerCapacityKw: 12,
    cableCount: 184,
    qrAssets: ["PP-000128", "PP-000142", "PP-000158"],
    devices: [
      {
        id: "pp-a12-01",
        hostname: "PP-A12-PATCH-01",
        kind: "Patch Panel",
        ip: "N/A",
        serial: "PPNL-A12-001",
        startU: 40,
        heightU: 2,
        status: "Online",
        qrId: "PP-000142",
        vlans: ["Trunk"],
        ports: [
          { id: "a12-p1", label: "LC-01", connector: "LC", cableId: "CBL-8812" },
          { id: "a12-p2", label: "LC-02", connector: "LC" }
        ],
        lastUpdated: "4 min ago",
        technician: "Sean P."
      },
      {
        id: "sw-leaf-02",
        hostname: "SW-LEAF-02",
        kind: "Switch",
        ip: "10.20.12.2",
        serial: "AR-7280-A12-02",
        startU: 36,
        heightU: 1,
        status: "Online",
        qrId: "PP-000128",
        vlans: ["110", "120", "130", "4094"],
        ports: [
          { id: "eth1", label: "Et1", connector: "QSFP", cableId: "CBL-8812" },
          { id: "eth2", label: "Et2", connector: "QSFP", cableId: "CBL-8813" },
          { id: "eth48", label: "Et48", connector: "SFP" }
        ],
        lastUpdated: "1 min ago",
        technician: "David M."
      },
      {
        id: "srv-api-07",
        hostname: "SRV-API-07",
        kind: "Server",
        ip: "10.20.33.47",
        serial: "DL380-A12-07",
        startU: 24,
        heightU: 2,
        status: "Online",
        qrId: "PP-000158",
        vlans: ["120", "310"],
        ports: [
          { id: "nic1", label: "NIC1", connector: "SFP", cableId: "CBL-8813" },
          { id: "ilo", label: "iLO", connector: "RJ45" }
        ],
        lastUpdated: "9 min ago",
        technician: "Alex R."
      },
      {
        id: "pdu-a12-a",
        hostname: "PDU-A12-A",
        kind: "PDU",
        ip: "10.20.90.12",
        serial: "APC-A12-A",
        startU: 1,
        heightU: 1,
        status: "Online",
        qrId: "PP-000171",
        vlans: ["900"],
        ports: [{ id: "mgmt", label: "MGMT", connector: "RJ45" }],
        lastUpdated: "12 min ago",
        technician: "Jordan L."
      }
    ],
    cables: [
      { id: "CBL-8812", fromDevice: "PP-A12-PATCH-01", fromPort: "LC-01", toDevice: "SW-LEAF-02", toPort: "Et1", type: "Fiber", connector: "LC", destination: "RACK-B07 / SW-SPINE-01" },
      { id: "CBL-8813", fromDevice: "SW-LEAF-02", fromPort: "Et2", toDevice: "SRV-API-07", toPort: "NIC1", type: "DAC", connector: "QSFP", destination: "SRV-API-07 NIC1" }
    ]
  },
  {
    id: "rack-b07",
    name: "RACK-B07",
    site: "DC1",
    room: "Room 3",
    row: "Core Row",
    health: "Healthy",
    temperature: 22.4,
    powerKw: 8.1,
    powerCapacityKw: 14,
    cableCount: 226,
    qrAssets: ["PP-000201", "PP-000202"],
    devices: [
      { id: "sw-spine-01", hostname: "SW-SPINE-01", kind: "Switch", ip: "10.20.1.11", serial: "AR-7800-B07-01", startU: 37, heightU: 2, status: "Online", qrId: "PP-000201", vlans: ["4094"], ports: [{ id: "eth12", label: "Et12", connector: "QSFP", cableId: "CBL-8812" }], lastUpdated: "2 min ago", technician: "Alex R." },
      { id: "sto-core-04", hostname: "STO-CORE-04", kind: "Storage", ip: "10.20.44.14", serial: "PURE-B07-04", startU: 18, heightU: 4, status: "Online", qrId: "PP-000202", vlans: ["220", "320"], ports: [{ id: "fc1", label: "FC1", connector: "LC" }], lastUpdated: "18 min ago", technician: "Chris B." }
    ],
    cables: [{ id: "CBL-8812", fromDevice: "SW-SPINE-01", fromPort: "Et12", toDevice: "SW-LEAF-02", toPort: "Et1", type: "Fiber", connector: "LC", destination: "RACK-A12 / SW-LEAF-02" }]
  },
  {
    id: "rack-c03",
    name: "RACK-C03",
    site: "DC1",
    room: "Room 4",
    row: "Compute Row",
    health: "Critical",
    temperature: 29.6,
    powerKw: 11.7,
    powerCapacityKw: 12,
    cableCount: 301,
    qrAssets: ["PP-000301", "PP-000302"],
    devices: [
      { id: "gpu-train-01", hostname: "GPU-TRAIN-01", kind: "Server", ip: "10.21.70.11", serial: "DGX-C03-01", startU: 28, heightU: 6, status: "Warning", qrId: "PP-000301", vlans: ["700", "710"], ports: [{ id: "ib1", label: "IB1", connector: "MPO", cableId: "CBL-9401" }], lastUpdated: "Just now", technician: "David M." },
      { id: "ups-c03-a", hostname: "UPS-C03-A", kind: "UPS", ip: "10.21.90.31", serial: "UPS-C03-A", startU: 1, heightU: 4, status: "Offline", qrId: "PP-000302", vlans: ["900"], ports: [{ id: "mgmt", label: "MGMT", connector: "RJ45" }], lastUpdated: "23 min ago", technician: "Mike T." }
    ],
    cables: [{ id: "CBL-9401", fromDevice: "GPU-TRAIN-01", fromPort: "IB1", toDevice: "IB-FABRIC-02", toPort: "MPO-18", type: "Fiber", connector: "MPO", destination: "IB-FABRIC-02 / MPO-18" }]
  },
  {
    id: "rack-a01",
    name: "RACK-A01",
    site: "DC2",
    room: "MDF",
    row: "Storage Row",
    health: "Warning",
    temperature: 25.1,
    powerKw: 5.2,
    powerCapacityKw: 10,
    cableCount: 132,
    qrAssets: ["PP-000401"],
    devices: [
      { id: "nas-edge-01", hostname: "NAS-EDGE-01", kind: "Storage", ip: "10.30.40.8", serial: "NAS-A01-08", startU: 22, heightU: 4, status: "Online", qrId: "PP-000401", vlans: ["240"], ports: [{ id: "eth1", label: "Eth1", connector: "SFP" }], lastUpdated: "7 min ago", technician: "Jordan L." }
    ],
    cables: []
  }
];

const generatedRackFleet: RackRecord[] = Array.from({ length: 28 }).map((_, index) => {
  const source = rackInventory[index % rackInventory.length];
  const row = ["A", "B", "C", "D"][Math.floor(index / 7)];
  const number = String((index % 7) + 1).padStart(2, "0");
  const site = index > 20 ? "DC2" : "DC1";
  const room = index > 20 ? "MDF" : index > 13 ? "Room 4" : "Room 3";
  const health: RackHealth = index % 11 === 0 ? "Critical" : index % 5 === 0 ? "Warning" : "Healthy";

  return {
    ...source,
    id: `rack-gen-${row.toLowerCase()}${number}`,
    name: `RACK-${row}${number}`,
    site,
    room,
    row: `Row ${row}`,
    health,
    temperature: Number((source.temperature + (index % 6) * 0.7).toFixed(1)),
    powerKw: Number((source.powerKw + (index % 4) * 0.55).toFixed(1)),
    cableCount: source.cableCount + index * 7,
    qrAssets: source.qrAssets.map((asset, assetIndex) => `PP-${String(500 + index * 10 + assetIndex).padStart(6, "0")}`),
    devices: source.devices.map((device, deviceIndex) => ({
      ...device,
      id: `${device.id}-${row}${number}`,
      hostname: `${device.kind === "Switch" ? "SW" : device.kind === "Server" ? "SRV" : device.kind === "Storage" ? "STO" : device.kind.toUpperCase().replace(" ", "-")}-${row}${number}-${String(deviceIndex + 1).padStart(2, "0")}`,
      ip: device.ip === "N/A" ? "N/A" : `10.${site === "DC1" ? "20" : "30"}.${index + 10}.${deviceIndex + 10}`,
      serial: `${device.serial}-${row}${number}`,
      qrId: `PP-${String(600 + index * 10 + deviceIndex).padStart(6, "0")}`,
      status: health === "Critical" && deviceIndex === 0 ? "Warning" : device.status
    })),
    cables: source.cables.map((cable, cableIndex) => ({
      ...cable,
      id: `CBL-${8800 + index * 10 + cableIndex}`,
      destination: `${site} / ${room} / Row ${row}`
    }))
  };
});

const rackFleet = [...rackInventory, ...generatedRackFleet];

const cableInventory: CableInventoryItem[] = [
  {
    id: "INV-CBL-001",
    sku: "LC-LC-OS2-2M",
    category: "Fiber",
    type: "OS2 single-mode patch cable",
    vendor: "Corning",
    length: "2m",
    connector: "LC-LC",
    speed: "10G / 25G / 100G",
    quantity: 184,
    minimum: 80,
    location: "DC1 / Room 3",
    bin: "FIB-A1",
    status: "In Stock",
    owner: "Infrastructure",
    lastCounted: "Today",
    notes: "Standard yellow patch leads for switch-to-panel runs."
  },
  {
    id: "INV-CBL-002",
    sku: "LC-LC-OM4-3M",
    category: "Fiber",
    type: "OM4 multimode patch cable",
    vendor: "Panduit",
    length: "3m",
    connector: "LC-LC",
    speed: "10G / 25G / 40G",
    quantity: 42,
    minimum: 60,
    location: "DC1 / Room 4",
    bin: "FIB-B3",
    status: "Low Stock",
    owner: "Data Center",
    lastCounted: "2 hours ago",
    notes: "Used heavily for compute row expansions."
  },
  {
    id: "INV-CBL-003",
    sku: "MPO12-OM4-10M",
    category: "Fiber",
    type: "MPO-12 trunk",
    vendor: "FS",
    length: "10m",
    connector: "MPO-MPO",
    speed: "40G / 100G",
    quantity: 18,
    minimum: 12,
    location: "DC1 / Room 4",
    bin: "TRK-C2",
    status: "Reserved",
    owner: "Network",
    lastCounted: "Yesterday",
    notes: "Reserved for GPU fabric uplinks and IB aggregation."
  },
  {
    id: "INV-CBL-004",
    sku: "DAC-QSFP28-1M",
    category: "DAC",
    type: "QSFP28 passive DAC",
    vendor: "Arista",
    length: "1m",
    connector: "QSFP28-QSFP28",
    speed: "100G",
    quantity: 76,
    minimum: 30,
    location: "DC1 / Room 3",
    bin: "DAC-A4",
    status: "In Stock",
    owner: "Network",
    lastCounted: "Today",
    notes: "Primary leaf-to-server short run cable."
  },
  {
    id: "INV-CBL-005",
    sku: "DAC-SFP28-3M",
    category: "DAC",
    type: "SFP28 passive DAC",
    vendor: "Cisco",
    length: "3m",
    connector: "SFP28-SFP28",
    speed: "25G",
    quantity: 29,
    minimum: 40,
    location: "DC2 / MDF",
    bin: "DAC-D1",
    status: "Low Stock",
    owner: "Network",
    lastCounted: "May 27",
    notes: "Keep extra stock for storage and edge nodes."
  },
  {
    id: "INV-CBL-006",
    sku: "CAT6A-BLU-1FT",
    category: "Copper",
    type: "Cat6A copper patch cable",
    vendor: "Leviton",
    length: "1ft",
    connector: "RJ45-RJ45",
    speed: "1G / 10G",
    quantity: 312,
    minimum: 120,
    location: "Main Store",
    bin: "COP-A1",
    status: "In Stock",
    owner: "Field Ops",
    lastCounted: "Today",
    notes: "Blue management-network patch cables."
  },
  {
    id: "INV-CBL-007",
    sku: "CAT6A-RED-3FT",
    category: "Copper",
    type: "Cat6A copper patch cable",
    vendor: "Belden",
    length: "3ft",
    connector: "RJ45-RJ45",
    speed: "1G / 10G",
    quantity: 22,
    minimum: 35,
    location: "Main Store",
    bin: "COP-B2",
    status: "Quarantine",
    owner: "Field Ops",
    lastCounted: "May 26",
    notes: "Hold until failed batch labels are reconciled."
  },
  {
    id: "INV-GBIC-001",
    sku: "SFP-10G-LR",
    category: "Transceiver",
    type: "10G LR SFP+ optic",
    vendor: "Cisco",
    length: "10km",
    connector: "LC",
    speed: "10G",
    quantity: 64,
    minimum: 24,
    location: "DC1 / Optics Locker",
    bin: "OPT-A1",
    status: "In Stock",
    owner: "Network",
    lastCounted: "Today",
    notes: "Long-reach single-mode GBIC/SFP+ pool."
  },
  {
    id: "INV-GBIC-002",
    sku: "SFP-10G-SR",
    category: "Transceiver",
    type: "10G SR SFP+ optic",
    vendor: "Finisar",
    length: "300m",
    connector: "LC",
    speed: "10G",
    quantity: 14,
    minimum: 30,
    location: "DC1 / Optics Locker",
    bin: "OPT-A2",
    status: "Low Stock",
    owner: "Network",
    lastCounted: "Today",
    notes: "Order more before next access-switch rollout."
  },
  {
    id: "INV-GBIC-003",
    sku: "QSFP-100G-SR4",
    category: "Transceiver",
    type: "100G SR4 QSFP28 optic",
    vendor: "Arista",
    length: "100m",
    connector: "MPO",
    speed: "100G",
    quantity: 9,
    minimum: 12,
    location: "DC1 / Room 4",
    bin: "OPT-C1",
    status: "Reserved",
    owner: "Network",
    lastCounted: "Yesterday",
    notes: "Pinned to spine uplink expansion."
  },
  {
    id: "INV-GBIC-004",
    sku: "QSFP-40G-LR4",
    category: "Transceiver",
    type: "40G LR4 QSFP+ optic",
    vendor: "Juniper",
    length: "10km",
    connector: "LC",
    speed: "40G",
    quantity: 6,
    minimum: 8,
    location: "DC2 / MDF",
    bin: "OPT-D3",
    status: "Deployed",
    owner: "Network",
    lastCounted: "May 25",
    notes: "Mostly deployed; keep as replacement stock only."
  }
];

// ── New screen types ──────────────────────────────────────────────────────────

type TicketPriority = "Critical" | "High" | "Medium" | "Low";
type TicketStatus = "Open" | "In Progress" | "Pending" | "Resolved" | "Closed";
type TicketSource = "QR Scan" | "Manual" | "Alert" | "Import";

type TicketRecord = {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  assetId: string;
  assetName: string;
  assignee: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
};

type TechnicianDetail = {
  id: string;
  name: string;
  initials: string;
  task: string;
  status: Health;
  site: string;
  lastSeen: string;
  ticketsOpen: number;
  scansToday: number;
  phone: string;
  email: string;
  recentActivity: { action: string; time: string; tone: Tone }[];
};

// ── Demo data ─────────────────────────────────────────────────────────────────

const demoTickets: TicketRecord[] = [
  { id: "TK-1254", title: "UPS-C03-A offline alert", description: "UPS unit in RACK-C03 has been offline for 23 minutes. Field check required to determine root cause before the next GPU training batch.", priority: "Critical", status: "Open", source: "Alert", assetId: "PP-000302", assetName: "UPS-C03-A", assignee: "Mike T.", provider: "Local", createdAt: "27 min ago", updatedAt: "27 min ago" },
  { id: "TK-1253", title: "Fiber signal inconclusive on Fiber-221", description: "Camera validation on Fiber-221 returned an inconclusive result. Signal test needs to be re-run under better lighting conditions.", priority: "High", status: "In Progress", source: "QR Scan", assetId: "PP-000501", assetName: "CBL-A12-B07-LC-01", assignee: "Alex R.", provider: "Local", createdAt: "11 min ago", updatedAt: "4 min ago" },
  { id: "TK-1252", title: "Duplicate QR code — PP-000128", description: "Two records matched the same QR payload PP-000128. Operator review needed to consolidate or purge the duplicate before the next sync.", priority: "High", status: "Pending", source: "Alert", assetId: "PP-000128", assetName: "SW-LEAF-02", assignee: "David M.", provider: "Local", createdAt: "18 min ago", updatedAt: "18 min ago" },
  { id: "TK-1251", title: "RACK-C03 cooling threshold exceeded", description: "Temperature at 29.6°C with power draw at 97% of modeled capacity. Requires cooling check before next training cycle.", priority: "High", status: "Open", source: "Alert", assetId: "rack-c03", assetName: "RACK-C03", assignee: "Jordan L.", provider: "Local", createdAt: "35 min ago", updatedAt: "35 min ago" },
  { id: "TK-1250", title: "STO-CORE-04 firmware maintenance window", description: "Storage controller firmware upgrade scheduled. System will be unavailable; coordinate downtime window with the Platform team.", priority: "Medium", status: "In Progress", source: "Manual", assetId: "PP-000202", assetName: "STO-CORE-04", assignee: "Chris B.", provider: "Local", createdAt: "2 hr ago", updatedAt: "45 min ago" },
  { id: "TK-1249", title: "GPU-TRAIN-01 high power draw validation", description: "Validate cooling capacity before next training batch. Power draw exceeds normal operating threshold; IB fabric audit also recommended.", priority: "Medium", status: "Open", source: "Manual", assetId: "PP-000301", assetName: "GPU-TRAIN-01", assignee: "David M.", provider: "Local", createdAt: "2 hr ago", updatedAt: "2 hr ago" },
  { id: "TK-1248", title: "Cable CBL-MGMT-C03-UPS replacement", description: "Cat6A cable tagged for replacement while UPS-C03-A is offline. Coordinate with Facilities before swapping to avoid losing MGMT connectivity.", priority: "Low", status: "Open", source: "QR Scan", assetId: "PP-000502", assetName: "CBL-MGMT-C03-UPS", assignee: "Mike T.", provider: "Local", createdAt: "3 hr ago", updatedAt: "3 hr ago" },
  { id: "TK-1247", title: "QR label batch print — 24 assets", description: "QR labels were prepared for 24 assets from the asset registry. Verify all labels printed correctly and are physically applied.", priority: "Low", status: "Resolved", source: "Import", assetId: "", assetName: "24 assets", assignee: "Sean P.", provider: "Local", createdAt: "8 hr ago", updatedAt: "3 min ago" }
];

const technicianDetails: TechnicianDetail[] = [
  {
    id: "tech-david",
    name: "David M.",
    initials: "DM",
    task: "Rack Audit",
    status: "Online",
    site: "DC1",
    lastSeen: "Just now",
    ticketsOpen: 2,
    scansToday: 14,
    phone: "+1-555-0101",
    email: "david.m@ops.local",
    recentActivity: [
      { action: "Saved new asset PP-000132 to local DB", time: "Just now", tone: "green" },
      { action: "Reviewed duplicate QR flag TK-1252", time: "18 min ago", tone: "amber" },
      { action: "Linked ticket TK-1254 in Command", time: "8 min ago", tone: "blue" },
      { action: "Opened rack audit RACK-A12", time: "1 hr ago", tone: "blue" }
    ]
  },
  {
    id: "tech-alex",
    name: "Alex R.",
    initials: "AR",
    task: "Fiber Validation",
    status: "Online",
    site: "DC1",
    lastSeen: "4 min ago",
    ticketsOpen: 1,
    scansToday: 9,
    phone: "+1-555-0102",
    email: "alex.r@ops.local",
    recentActivity: [
      { action: "Fiber signal detected on Fiber-221", time: "11 min ago", tone: "green" },
      { action: "Scanned RACK-B07 via QR", time: "6 min ago", tone: "blue" },
      { action: "Assigned to TK-1253", time: "4 min ago", tone: "amber" }
    ]
  },
  {
    id: "tech-sean",
    name: "Sean P.",
    initials: "SP",
    task: "QR Deployment",
    status: "Online",
    site: "DC1",
    lastSeen: "Just now",
    ticketsOpen: 0,
    scansToday: 22,
    phone: "+1-555-0103",
    email: "sean.p@ops.local",
    recentActivity: [
      { action: "Scanned Rack DC-A12 via QR label", time: "Just now", tone: "green" },
      { action: "Printed 24 QR labels — TK-1247 resolved", time: "3 min ago", tone: "purple" },
      { action: "Imported spreadsheet (13 rows)", time: "4 min ago", tone: "blue" }
    ]
  },
  {
    id: "tech-mike",
    name: "Mike T.",
    initials: "MT",
    task: "Break/Fix",
    status: "Offline",
    site: "DC1",
    lastSeen: "28 min ago",
    ticketsOpen: 2,
    scansToday: 3,
    phone: "+1-555-0104",
    email: "mike.t@ops.local",
    recentActivity: [
      { action: "Printed QR label PP-000171", time: "27 min ago", tone: "purple" },
      { action: "Offline — last sync 28 min ago", time: "28 min ago", tone: "red" }
    ]
  },
  {
    id: "tech-jordan",
    name: "Jordan L.",
    initials: "JL",
    task: "Inventory Scan",
    status: "Pending",
    site: "DC2",
    lastSeen: "45 min ago",
    ticketsOpen: 1,
    scansToday: 7,
    phone: "+1-555-0105",
    email: "jordan.l@ops.local",
    recentActivity: [
      { action: "Scanned NAS-EDGE-01 at RACK-A01", time: "7 min ago", tone: "green" },
      { action: "Pending sync since 45 min ago", time: "45 min ago", tone: "amber" }
    ]
  },
  {
    id: "tech-chris",
    name: "Chris B.",
    initials: "CB",
    task: "Site Survey",
    status: "Offline",
    site: "DC2",
    lastSeen: "2 hr ago",
    ticketsOpen: 1,
    scansToday: 5,
    phone: "+1-555-0106",
    email: "chris.b@ops.local",
    recentActivity: [
      { action: "Assigned to TK-1250 maintenance window", time: "45 min ago", tone: "blue" },
      { action: "Offline since 2 hr ago", time: "2 hr ago", tone: "red" }
    ]
  }
];

const assetTableSchema = `assets
- id
- qr_code
- asset_type
- name
- serial
- status
- site
- room
- rack
- ru_position
- ip_address
- mac_address
- switch_port
- cable_type
- connector_type
- notes
- created_at
- updated_at`;

function createAssetDraft(id: string, scannedValue = ""): AssetRecord {
  const now = new Date().toISOString();
  const sourceNote = scannedValue && scannedValue !== id ? `Scanned source: ${scannedValue}` : "";

  return {
    id,
    qrCode: id,
    assetType: "Server",
    name: "",
    serial: "",
    status: "Active",
    site: "Main DC",
    room: "",
    rack: "",
    ruPosition: "",
    ipAddress: "",
    macAddress: "",
    vlan: "",
    switchPort: "",
    cableType: "",
    length: "",
    connectorType: "",
    from: "",
    to: "",
    notes: sourceNote,
    tags: "",
    owner: "Operations",
    createdAt: now,
    updatedAt: now
  };
}

const emptyAsset = (): AssetRecord => createAssetDraft(createAssetId());

const demoAssetInventory: AssetRecord[] = [
  {
    id: "PP-000128",
    qrCode: "PP-000128",
    assetType: "Switch",
    name: "SW-LEAF-02",
    serial: "AR-7280-A12-02",
    status: "Active",
    site: "DC1",
    room: "Room 3",
    rack: "RACK-A12",
    ruPosition: "U36",
    ipAddress: "10.20.12.2",
    macAddress: "A4:3F:68:12:02:AA",
    vlan: "110, 120, 130, 4094",
    switchPort: "Et1-Et48",
    cableType: "Fiber / DAC",
    length: "",
    connectorType: "QSFP / SFP",
    from: "RACK-A12",
    to: "RACK-B07",
    notes: "Production leaf switch. QR label verified during last rack audit.",
    tags: "network,leaf,production",
    owner: "Network",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T03:50:00.000Z"
  },
  {
    id: "PP-000142",
    qrCode: "PP-000142",
    assetType: "Patch Panel",
    name: "PP-A12-PATCH-01",
    serial: "PPNL-A12-001",
    status: "In Service",
    site: "DC1",
    room: "Room 3",
    rack: "RACK-A12",
    ruPosition: "U40-U41",
    ipAddress: "",
    macAddress: "",
    vlan: "Trunk",
    switchPort: "LC-01 - LC-24",
    cableType: "OS2 / OM4",
    length: "",
    connectorType: "LC",
    from: "Fiber tray A",
    to: "Leaf row",
    notes: "Panel mapping complete. Two unused LC ports reserved for spine uplink.",
    tags: "fiber,patch-panel",
    owner: "Infrastructure",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T03:44:00.000Z"
  },
  {
    id: "PP-000158",
    qrCode: "PP-000158",
    assetType: "Server",
    name: "SRV-API-07",
    serial: "DL380-A12-07",
    status: "Active",
    site: "DC1",
    room: "Room 3",
    rack: "RACK-A12",
    ruPosition: "U24-U25",
    ipAddress: "10.20.33.47",
    macAddress: "3C:EC:EF:A1:07:19",
    vlan: "120, 310",
    switchPort: "SW-LEAF-02 Et2",
    cableType: "DAC",
    length: "1m",
    connectorType: "QSFP",
    from: "SW-LEAF-02 Et2",
    to: "NIC1",
    notes: "API node, dual PSU. NIC1 patched; iLO on management copper.",
    tags: "server,api,production",
    owner: "Platform",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T03:42:00.000Z"
  },
  {
    id: "PP-000201",
    qrCode: "PP-000201",
    assetType: "Switch",
    name: "SW-SPINE-01",
    serial: "AR-7800-B07-01",
    status: "Active",
    site: "DC1",
    room: "Room 3",
    rack: "RACK-B07",
    ruPosition: "U37-U38",
    ipAddress: "10.20.1.11",
    macAddress: "A4:3F:68:78:01:B7",
    vlan: "4094",
    switchPort: "Et1-Et32",
    cableType: "Fiber",
    length: "10m",
    connectorType: "LC / QSFP",
    from: "Core row",
    to: "Leaf rows",
    notes: "Spine fabric switch. Uplink CBL-8812 mapped to A12 leaf.",
    tags: "network,spine,fabric",
    owner: "Network",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T03:40:00.000Z"
  },
  {
    id: "PP-000202",
    qrCode: "PP-000202",
    assetType: "Storage",
    name: "STO-CORE-04",
    serial: "PURE-B07-04",
    status: "Maintenance",
    site: "DC1",
    room: "Room 3",
    rack: "RACK-B07",
    ruPosition: "U18-U21",
    ipAddress: "10.20.44.14",
    macAddress: "90:3A:72:B7:04:FC",
    vlan: "220, 320",
    switchPort: "FC1",
    cableType: "Fiber",
    length: "3m",
    connectorType: "LC",
    from: "Storage fabric",
    to: "Core switch",
    notes: "Maintenance window scheduled for controller firmware check.",
    tags: "storage,maintenance",
    owner: "Storage",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-27T18:20:00.000Z"
  },
  {
    id: "PP-000301",
    qrCode: "PP-000301",
    assetType: "Server",
    name: "GPU-TRAIN-01",
    serial: "DGX-C03-01",
    status: "Maintenance",
    site: "DC1",
    room: "Room 4",
    rack: "RACK-C03",
    ruPosition: "U28-U33",
    ipAddress: "10.21.70.11",
    macAddress: "7C:FE:90:C3:01:11",
    vlan: "700, 710",
    switchPort: "IB1",
    cableType: "Fiber",
    length: "10m",
    connectorType: "MPO",
    from: "GPU-TRAIN-01 IB1",
    to: "IB-FABRIC-02 MPO-18",
    notes: "High power draw; validate cooling before next training batch.",
    tags: "gpu,compute,high-power",
    owner: "AI Platform",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T02:58:00.000Z"
  },
  {
    id: "PP-000302",
    qrCode: "PP-000302",
    assetType: "UPS",
    name: "UPS-C03-A",
    serial: "UPS-C03-A",
    status: "Offline",
    site: "DC1",
    room: "Room 4",
    rack: "RACK-C03",
    ruPosition: "U1-U4",
    ipAddress: "10.21.90.31",
    macAddress: "00:C0:B7:C0:03:31",
    vlan: "900",
    switchPort: "MGMT",
    cableType: "Copper",
    length: "3ft",
    connectorType: "RJ45",
    from: "MGMT switch",
    to: "UPS-C03-A",
    notes: "Offline alert active. Field check required.",
    tags: "power,offline",
    owner: "Facilities",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T02:37:00.000Z"
  },
  {
    id: "PP-000401",
    qrCode: "PP-000401",
    assetType: "Storage",
    name: "NAS-EDGE-01",
    serial: "NAS-A01-08",
    status: "Active",
    site: "DC2",
    room: "MDF",
    rack: "RACK-A01",
    ruPosition: "U22-U25",
    ipAddress: "10.30.40.8",
    macAddress: "44:8A:5B:A0:10:08",
    vlan: "240",
    switchPort: "Eth1",
    cableType: "Copper",
    length: "3ft",
    connectorType: "RJ45",
    from: "Edge switch",
    to: "NAS-EDGE-01",
    notes: "Branch storage endpoint, QR verified by Jordan.",
    tags: "storage,edge,dc2",
    owner: "Storage",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T02:10:00.000Z"
  },
  {
    id: "PP-000501",
    qrCode: "PP-000501",
    assetType: "Fiber Cable",
    name: "CBL-A12-B07-LC-01",
    serial: "CBL-8812",
    status: "In Service",
    site: "DC1",
    room: "Room 3",
    rack: "RACK-A12",
    ruPosition: "Tray A",
    ipAddress: "",
    macAddress: "",
    vlan: "4094",
    switchPort: "SW-LEAF-02 Et1",
    cableType: "OS2 Fiber",
    length: "10m",
    connectorType: "LC-LC",
    from: "PP-A12-PATCH-01 LC-01",
    to: "SW-SPINE-01 Et12",
    notes: "Primary leaf-to-spine fiber run. Light validation passed during last audit.",
    tags: "cable,fiber,leaf-spine",
    owner: "Network",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T03:38:00.000Z"
  },
  {
    id: "PP-000502",
    qrCode: "PP-000502",
    assetType: "Copper Cable",
    name: "CBL-MGMT-C03-UPS",
    serial: "CBL-9402",
    status: "Maintenance",
    site: "DC1",
    room: "Room 4",
    rack: "RACK-C03",
    ruPosition: "MGMT tray",
    ipAddress: "",
    macAddress: "",
    vlan: "900",
    switchPort: "MGMT",
    cableType: "Cat6A",
    length: "3ft",
    connectorType: "RJ45",
    from: "MGMT switch",
    to: "UPS-C03-A",
    notes: "Cable is tagged for replacement while UPS-C03-A is offline.",
    tags: "cable,copper,maintenance",
    owner: "Facilities",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T02:30:00.000Z"
  },
  {
    id: "PP-000601",
    qrCode: "PP-000601",
    assetType: "GBIC",
    name: "SFP-10G-LR-A12-01",
    serial: "FIN-LR-10G-A1201",
    status: "In Stock",
    site: "DC1",
    room: "Optics Locker",
    rack: "BIN-OPT-A1",
    ruPosition: "",
    ipAddress: "",
    macAddress: "",
    vlan: "",
    switchPort: "",
    cableType: "Single-mode optic",
    length: "10km",
    connectorType: "LC",
    from: "Optics Locker",
    to: "Unassigned",
    notes: "10G LR SFP+ spare, ready for leaf or firewall uplink replacement.",
    tags: "gbic,optic,sfp,spare",
    owner: "Network",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T03:20:00.000Z"
  },
  {
    id: "PP-000602",
    qrCode: "PP-000602",
    assetType: "GBIC",
    name: "QSFP-100G-SR4-C03-02",
    serial: "ARI-SR4-C0302",
    status: "In Service",
    site: "DC1",
    room: "Room 4",
    rack: "RACK-C03",
    ruPosition: "U28",
    ipAddress: "",
    macAddress: "",
    vlan: "700",
    switchPort: "GPU-TRAIN-01 IB1",
    cableType: "Multimode optic",
    length: "100m",
    connectorType: "MPO",
    from: "GPU-TRAIN-01",
    to: "IB-FABRIC-02",
    notes: "100G SR4 optic assigned to GPU fabric validation path.",
    tags: "gbic,optic,qsfp,gpu",
    owner: "AI Platform",
    createdAt: "2026-05-01T08:15:00.000Z",
    updatedAt: "2026-05-28T02:56:00.000Z"
  }
];

function createAssetId() {
  const storedNext = Number(window.localStorage.getItem("patchpilot_asset_sequence") || "128");
  const next = Number.isFinite(storedNext) ? storedNext : 128;
  window.localStorage.setItem("patchpilot_asset_sequence", String(next + 1));
  return `PP-${String(next).padStart(6, "0")}`;
}

function getQrPayload(asset: AssetRecord) {
  return `patchpilot://asset/${asset.id}`;
}

function normalizeAssetLookup(value: string) {
  return value.trim().replace("patchpilot://asset/", "").replace("https://app.patchpilot.io/a/", "");
}

function normalizeImportHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-./:()#"']/g, "");
}

function stringifyImportValue(value: unknown) {
  if (value === null || typeof value === "undefined") return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function readImportedValue(row: ImportedAssetRow, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeImportHeader);

  for (const [header, value] of Object.entries(row)) {
    if (normalizedAliases.includes(normalizeImportHeader(header))) {
      return stringifyImportValue(value);
    }
  }

  return "";
}

function readImportedCableNumber(row: ImportedAssetRow) {
  return readImportedValue(row, ["cable number", "cable no", "cable id", "cable", "cable#", "מספר כבל", "כבל", "מספרכבל"]);
}

function normalizeImportedStatus(value: string): AssetStatus {
  const normalized = value.trim().toLowerCase();
  const match = assetStatuses.find((status) => status.toLowerCase() === normalized);
  if (match) return match;
  if (["פעיל", "active", "online"].includes(normalized)) return "Active";
  if (["בשירות", "inservice", "in service"].includes(normalized)) return "In Service";
  if (["במלאי", "stock", "instock", "in stock"].includes(normalized)) return "In Stock";
  if (["תקלה", "maintenance", "טיפול"].includes(normalized)) return "Maintenance";
  if (["offline", "לאפעיל", "לא פעיל"].includes(normalized)) return "Offline";
  if (["retired", "יצאמשימוש", "יצא משימוש"].includes(normalized)) return "Retired";
  return "Active";
}

function inferImportedAssetType(row: ImportedAssetRow) {
  const explicitType = readImportedValue(row, ["asset type", "type", "category", "kind", "סוג", "קטגוריה", "סוג נכס"]);
  if (explicitType) return explicitType;

  const cableNumber = readImportedCableNumber(row);
  const connector = readImportedValue(row, ["connector", "connector type", "מחבר"]);
  const cableType = readImportedValue(row, ["cable type", "סוג כבל"]);
  const tags = readImportedValue(row, ["tags", "tag", "תגיות"]);
  const searchable = [cableNumber, connector, cableType, tags].join(" ").toLowerCase();

  if (searchable.includes("gbic") || searchable.includes("sfp") || searchable.includes("qsfp") || searchable.includes("optic")) return "GBIC";
  if (cableNumber || searchable.includes("fiber") || searchable.includes("copper") || searchable.includes("dac") || searchable.includes("כבל")) return "Fiber Cable";
  return "Server";
}

function createAssetFromImportedRow(row: ImportedAssetRow, rowIndex: number): AssetRecord | null {
  const now = new Date().toISOString();
  const importedId = readImportedValue(row, ["id", "asset id", "asset tag", "qr", "qr code", "qr id", "מזהה", "מזהה נכס", "קוד"]);
  const id = importedId ? normalizeAssetLookup(importedId) : createAssetId();
  const cableNumber = readImportedCableNumber(row);
  const assetType = inferImportedAssetType(row);
  const name = readImportedValue(row, ["name", "asset name", "hostname", "host", "device name", "שם", "שם נכס", "שרת"]) || cableNumber || `${assetType} ${rowIndex + 1}`;
  const serial = readImportedValue(row, ["serial", "serial number", "s/n", "sn", "service tag", "סריאל", "מספר סידורי"]) || cableNumber;
  const ipAddress = readImportedValue(row, ["ip", "ip address", "management ip", "mgmt ip", "אייפי", "ip ניהול", "כתובת ip"]);

  if (!id || (!name && !serial && !ipAddress && !cableNumber)) return null;

  return {
    id,
    qrCode: id,
    assetType,
    name,
    serial,
    status: normalizeImportedStatus(readImportedValue(row, ["status", "state", "סטטוס", "מצב"])),
    site: readImportedValue(row, ["site", "location", "dc", "datacenter", "אתר", "מיקום"]),
    room: readImportedValue(row, ["room", "חדר"]),
    rack: readImportedValue(row, ["rack", "cabinet", "ארון", "מסד"]),
    ruPosition: readImportedValue(row, ["ru", "u", "ru position", "unit", "מיקום u"]),
    ipAddress,
    macAddress: readImportedValue(row, ["mac", "mac address", "מק", "כתובת mac"]),
    vlan: readImportedValue(row, ["vlan", "vlans"]),
    switchPort: readImportedValue(row, ["switch port", "port", "interface", "פורט", "כניסה"]),
    cableType: readImportedValue(row, ["cable type", "cable kind", "סוג כבל"]),
    length: readImportedValue(row, ["length", "reach", "אורך"]),
    connectorType: readImportedValue(row, ["connector", "connector type", "מחבר"]),
    from: readImportedValue(row, ["from", "source", "מקור", "מ"]),
    to: readImportedValue(row, ["to", "destination", "יעד", "אל"]),
    notes: readImportedValue(row, ["notes", "note", "comments", "הערות"]),
    tags: readImportedValue(row, ["tags", "tag", "תגיות"]) || (cableNumber ? "import,cable" : "import"),
    owner: readImportedValue(row, ["owner", "team", "department", "אחראי", "צוות"]),
    createdAt: now,
    updatedAt: now
  };
}

function getBarcodeDetectorConstructor() {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
}

function detectFiberSignal(imageData: ImageData): FiberSignalResult | null {
  const { data, width, height } = imageData;

  // ── Thresholds tuned for fiber laser physics ──────────────────────────
  //
  // RED laser 650 nm — visible, clips red channel hard
  const RED_SAT   = 242;
  const RED_RATIO = 2.8;   // R must be 2.8× both G and B
  //
  // WHITE / broadband VIS — all channels near saturation
  const WHITE_SAT    = 242;
  const WHITE_SPREAD = 14;
  //
  // IR bleed  850 nm / 1310 nm / 1550 nm — camera IR-cut filter is imperfect.
  // IR stimulates red + blue photosites but NOT green → appears purple/violet.
  // Signature: R and B are both elevated, G is significantly suppressed.
  const IR_MIN_RB  = 160;   // both R and B must be this bright
  const IR_G_RATIO = 1.8;   // R/G and B/G must both exceed this (G stays dim)
  const IR_MAX_RATIO = 0.015; // still must be a small spot
  // ─────────────────────────────────────────────────────────────────────

  const xMin = Math.floor(width  * 0.15);
  const xMax = Math.floor(width  * 0.85);
  const yMin = Math.floor(height * 0.15);
  const yMax = Math.floor(height * 0.85);
  const step = 2;

  let redPx    = 0;
  let whitePx  = 0;
  let irPx     = 0;
  let total    = 0;
  let maxBrt   = 0;

  for (let y = yMin; y < yMax; y += step) {
    for (let x = xMin; x < xMax; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brt = Math.max(r, g, b);
      const spd = brt - Math.min(r, g, b);

      total++;
      if (brt > maxBrt) maxBrt = brt;

      // Red laser 650 nm
      if (r >= RED_SAT
          && r / Math.max(g, 1) >= RED_RATIO
          && r / Math.max(b, 1) >= RED_RATIO) {
        redPx++;
      }
      // White / VIS laser
      else if (r >= WHITE_SAT && g >= WHITE_SAT && b >= WHITE_SAT && spd <= WHITE_SPREAD) {
        whitePx++;
      }
      // IR bleed — purple/violet signature: R≈B high, G low
      else if (r >= IR_MIN_RB
          && b >= IR_MIN_RB
          && r / Math.max(g, 1) >= IR_G_RATIO
          && b / Math.max(g, 1) >= IR_G_RATIO
          && Math.abs(r - b) < 60) {   // R and B close to each other → purple
        irPx++;
      }
    }
  }

  const hotPx    = redPx + whitePx + irPx;
  const hotRatio = hotPx / Math.max(total, 1);

  if (hotPx < 4 || hotRatio > IR_MAX_RATIO || maxBrt < 140) return null;

  // Determine dominant signal type
  if (irPx > redPx && irPx > whitePx) {
    return {
      color: "purple",
      score: Math.min(100, Math.round(irPx / 0.5)),
      wavelengthHint: "IR (850–1550 nm) — purple/violet bleed through camera filter"
    };
  }

  return {
    color: redPx >= whitePx ? "red" : "white",
    score: Math.min(100, Math.round(hotPx / 0.6)),
    wavelengthHint: redPx >= whitePx ? "Red laser ~650 nm (VFL)" : "White / broadband VIS"
  };
}

function assetMatchesQuery(asset: AssetRecord, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;

  return [
    asset.id,
    asset.qrCode,
    asset.name,
    asset.assetType,
    asset.serial,
    asset.status,
    asset.site,
    asset.room,
    asset.rack,
    asset.ruPosition,
    asset.ipAddress,
    asset.macAddress,
    asset.vlan,
    asset.switchPort,
    asset.cableType,
    asset.length,
    asset.connectorType,
    asset.from,
    asset.to,
    asset.notes,
    asset.tags,
    asset.owner,
    getQrPayload(asset)
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function getAssetCategory(asset: AssetRecord): AssetCategory {
  const type = asset.assetType.toLowerCase();
  const tags = asset.tags.toLowerCase();

  if (type.includes("cable")) return "Cables";
  if (type.includes("gbic") || type.includes("transceiver") || tags.includes("gbic") || tags.includes("optic")) return "GBICs";
  if (type.includes("server")) return "Servers";
  return "Other";
}

function openAssetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("patchpilot_operations", 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.createObjectStore("assets", { keyPath: "id" });
      store.createIndex("qr_code", "qrCode", { unique: true });
      store.createIndex("asset_name", "name", { unique: false });
      store.createIndex("ip_address", "ipAddress", { unique: false });
      store.createIndex("rack", "rack", { unique: false });
      store.createIndex("serial", "serial", { unique: false });
      store.createIndex("mac_address", "macAddress", { unique: false });
      store.createIndex("switch_port", "switchPort", { unique: false });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAssetDatabase(): Promise<AssetDatabaseApi> {
  const database = await openAssetDatabase();

  return {
    getAll: () =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction("assets", "readonly");
        const request = transaction.objectStore("assets").getAll();
        request.onsuccess = () => resolve((request.result as AssetRecord[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        request.onerror = () => reject(request.error);
      }),
    put: (asset) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction("assets", "readwrite");
        const request = transaction.objectStore("assets").put(asset);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
    getById: (id) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction("assets", "readonly");
        const request = transaction.objectStore("assets").get(id);
        request.onsuccess = () => resolve((request.result as AssetRecord | undefined) ?? null);
        request.onerror = () => reject(request.error);
      })
  };
}

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState("Command");
  const [query, setQuery] = useState("");
  const [savedAssets, setSavedAssets] = useState<AssetRecord[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFiberValidatorOpen, setIsFiberValidatorOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState("Point the camera at a PatchPilot QR label.");
  const [actionNotice, setActionNotice] = useState("Command is ready: scan assets, create labels, import spreadsheets, or prepare service desk integrations.");
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [readNotifs, setReadNotifs] = useState<Set<number>>(new Set());
  const commandImportInputRef = useRef<HTMLInputElement | null>(null);

  const notifications = [
    { id: 1, severity: "critical" as Tone, title: "Rack DC1-R04 overheating", detail: "Temp 42°C — exceeds 40°C threshold", time: "2m ago" },
    { id: 2, severity: "amber"    as Tone, title: "Fiber validation failed", detail: "Port SFP-12 signal below threshold on DC2", time: "18m ago" },
    { id: 3, severity: "amber"    as Tone, title: "3 assets missing QR label", detail: "SRV-019, SRV-021, SW-044 need printing", time: "1h ago" },
    { id: 4, severity: "blue"     as Tone, title: "Import completed", detail: "47 assets added from rack-audit-june.xlsx", time: "2h ago" },
    { id: 5, severity: "slate"    as Tone, title: "Supabase sync pending", detail: "No credentials set — running offline only", time: "3h ago" },
  ];
  const unreadCount = notifications.filter((n) => !readNotifs.has(n.id)).length;

  async function refreshSavedAssets() {
    try {
      const database = await getAssetDatabase();
      const rows = await database.getAll();
      setSavedAssets(rows);
    } catch {
      setSavedAssets([]);
    }
  }

  useEffect(() => {
    void refreshSavedAssets();
  }, []);

  const visibleActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return liveActivity;
    return liveActivity.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
  }, [query]);

  const allAssets = useMemo(() => {
    const byId = new Map<string, AssetRecord>();
    demoAssetInventory.forEach((asset) => byId.set(asset.id, asset));
    savedAssets.forEach((asset) => byId.set(asset.id, asset));
    return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [savedAssets]);

  const searchAssets = useMemo(() => allAssets.filter((asset) => assetMatchesQuery(asset, query)).slice(0, 7), [allAssets, query]);

  const qrCommandStats = useMemo(() => {
    const qrLinked = allAssets.filter((asset) => asset.qrCode || asset.id).length;
    const savedLocal = savedAssets.length;
    const retrievable = allAssets.filter((asset) => asset.ipAddress || asset.serial || asset.rack || asset.switchPort).length;
    const needsQr = allAssets.filter((asset) => !asset.qrCode).length;

    return [
      { label: "QR-linked records", value: qrLinked.toLocaleString(), detail: `${savedLocal} saved in local DB` },
      { label: "Fast lookup fields", value: retrievable.toLocaleString(), detail: "ID, QR, IP, serial, rack, port" },
      { label: "Needs QR label", value: needsQr.toLocaleString(), detail: "Missing printable QR identity" }
    ];
  }, [allAssets, savedAssets.length]);

  function openAssetFromSearch(asset: AssetRecord) {
    setSelectedAsset(asset);
    setActiveNav("QR Studio");
    setQuery(asset.id);
    setIsSearchOpen(false);
  }

  async function importAssetsFromFile(file: File) {
    setActionNotice(`Importing ${file.name}...`);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setActionNotice("No worksheet found in this file.");
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<ImportedAssetRow>(sheet, { defval: "", raw: false });
      const importedAssets = rows
        .map((row, index) => createAssetFromImportedRow(row, index))
        .filter((asset): asset is AssetRecord => Boolean(asset));

      if (!importedAssets.length) {
        setActionNotice("No importable asset rows found. Check the header row.");
        return;
      }

      const database = await getAssetDatabase();
      await Promise.all(importedAssets.map((asset) => database.put(asset)));
      await refreshSavedAssets();
      setSelectedAsset(importedAssets[0]);
      setActiveNav("Assets");
      setQuery("");
      setIsSearchOpen(false);
      setActionNotice(`Imported ${importedAssets.length} assets. Open any row to print its QR.`);
    } catch {
      setActionNotice("Import failed. Use .xlsx, .xls, or .csv with a clear header row.");
    }
  }

  function handleCommandImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void importAssetsFromFile(file);
  }

  async function openAssetFromQrValue(value: string) {
    const id = normalizeAssetLookup(value);

    if (!id) {
      setScanMessage("No QR value detected.");
      return;
    }

    try {
      const database = await getAssetDatabase();
      const found = await database.getById(id);
      const fallbackAsset = demoAssetInventory.find((asset) => asset.id === id || asset.qrCode === id);

      if (!found && !fallbackAsset) {
        const shouldCreate = window.confirm(`QR/RFID code ${id} was not found in the database.\n\nAdd it as a new asset?`);

        if (shouldCreate) {
          setSelectedAsset(createAssetDraft(id, value.trim()));
          setActiveNav("QR Studio");
          setQuery("");
          setIsSearchOpen(false);
          setIsScannerOpen(false);
          setActionNotice(`QR/RFID ${id} was not found. Fill the asset details, then Save to DB.`);
          setScanMessage(`Create new asset for ${id}`);
          return;
        }

        setIsScannerOpen(false);
        setScanMessage(`No asset found for ${id}.`);
        setActionNotice(`QR/RFID ${id} was not found and was not added.`);
        return;
      }

      const resolvedAsset = found ?? fallbackAsset ?? null;
      setSelectedAsset(resolvedAsset);
      setActiveNav("QR Studio");
      setQuery(resolvedAsset?.id ?? id);
      setIsSearchOpen(false);
      setIsScannerOpen(false);
      setScanMessage(`Opened ${resolvedAsset?.id ?? id}`);
    } catch {
      setScanMessage("Asset database is unavailable. Try again in a moment.");
    }
  }

  function handleQuickAction(action: QuickAction) {
    setIsSearchOpen(false);

    switch (action.id) {
      case "scan":
        setScanMessage("Point the camera at a PatchPilot QR label.");
        setIsScannerOpen(true);
        setActionNotice("Scanner opened. Scan a QR label to retrieve the asset details.");
        break;
      case "rack-audit":
        setActiveNav("Racks");
        setQuery("rack");
        setActionNotice("Rack audit workspace opened.");
        break;
      case "print-labels":
        setActiveNav("QR Studio");
        setSelectedAsset(null);
        setQuery("");
        setActionNotice("Label workspace opened. Register the asset, save it to the local DB, then print the QR label.");
        break;
      case "work-order":
        setActiveNav("Tickets");
        setQuery("");
        setActionNotice("Service desk placeholder opened. Connect Jira, ServiceNow, or a custom ticket provider when ready.");
        break;
      case "fiber-test":
        setActiveNav("Command");
        setQuery("");
        setIsFiberValidatorOpen(true);
        setActionNotice("Fiber signal test opened. Hold the fiber tip close to the camera until a laser signal is detected.");
        break;
      case "import-assets":
        commandImportInputRef.current?.click();
        break;
    }
  }

  const isSelectedAssetSaved = selectedAsset ? allAssets.some((asset) => asset.id === selectedAsset.id || asset.qrCode === selectedAsset.id) : false;
  const isQrCreationView = activeNav === "QR Studio" && (!selectedAsset || !isSelectedAssetSaved);

  return (
    <main className="ops-shell">
      <input
        ref={commandImportInputRef}
        accept=".xlsx,.xls,.csv"
        className="asset-import-input"
        onChange={handleCommandImport}
        type="file"
      />
      <aside className="ops-sidebar">
        <div className="ops-brand">
          <div className="ops-logo">P</div>
          <div>
            <strong>PATCHPILOT</strong>
            <span>OPS COMMAND</span>
          </div>
        </div>

        <nav className="ops-nav" aria-label="Primary">
          {navItems.map((item) => (
            <button className={activeNav === item.label ? "active" : ""} key={item.label} onClick={() => setActiveNav(item.label)} type="button">
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.count && <small>{item.count}</small>}
            </button>
          ))}
        </nav>

        <div className="system-menu">
          <p>System</p>
          {systemItems.map((item) => (
            <button className={activeNav === item ? "active" : ""} key={item} onClick={() => setActiveNav(item)} type="button">
              <span className="nav-icon">{item.slice(0, 2).toUpperCase()}</span>
              {item}
            </button>
          ))}
        </div>

        <section className="sync-panel">
          <p>Sync Status</p>
          <div className="sync-row">
            <strong>All Systems</strong>
            <StatusPill status="Healthy" label="Healthy" />
          </div>
          <span>Last sync: 1 min ago</span>
          <div className="sync-line">
            <span>Offline Devices</span>
            <strong>2</strong>
          </div>
          <div className="sync-line">
            <span>Pending Items</span>
            <strong>12</strong>
          </div>
          <button type="button">Sync Now</button>
        </section>
      </aside>

      <section className="ops-main">
        {!isQrCreationView && (
          <>
            <header className="topbar">
              <div className="search-box global-search">
                <span>Search</span>
                <input
                  value={query}
                  onBlur={() => window.setTimeout(() => setIsSearchOpen(false), 140)}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Scan or search QR ID, asset name, IP, serial, rack, port..."
                />
                <kbd>CMD K</kbd>
                {isSearchOpen && query.trim() && (
                  <div className="global-search-menu">
                    <div className="global-search-title">
                      <strong>QR Registry</strong>
                      <span>{searchAssets.length ? `${searchAssets.length} found` : "No asset match"}</span>
                    </div>
                    {searchAssets.map((asset) => (
                      <button key={asset.id} onMouseDown={(event) => event.preventDefault()} onClick={() => openAssetFromSearch(asset)} type="button">
                        <span className="search-result-icon">QR</span>
                        <span>
                          <strong>{asset.name || asset.id}</strong>
                          <small>{asset.id} / {asset.assetType} / {asset.rack || asset.site || "No location"}</small>
                        </span>
                        <em>{asset.ipAddress || asset.serial || asset.macAddress || "Open"}</em>
                      </button>
                    ))}
                    {!searchAssets.length && (
                      <p>Try QR ID, asset name, IP address, rack, serial number, MAC address, VLAN, switch port, or tag.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="topbar-right">
                <span className="online-dot" />
                <strong>Online</strong>

                {/* ── Notifications bell ── */}
                <div className="topbar-dropdown-wrap">
                  <button className="bell" onClick={() => { setIsNotifOpen((v) => !v); setIsHelpOpen(false); }} type="button">
                    {unreadCount > 0 ? unreadCount : ""}
                  </button>
                  {isNotifOpen && (
                    <div className="notif-panel">
                      <header>
                        <span>Notifications</span>
                        <button onClick={() => setReadNotifs(new Set(notifications.map((n) => n.id)))} type="button">Mark all read</button>
                      </header>
                      <div className="notif-list">
                        {notifications.map((n) => (
                          <button className={`notif-row${readNotifs.has(n.id) ? " read" : ""}`} key={n.id} onClick={() => setReadNotifs((prev) => new Set([...prev, n.id]))} type="button">
                            <span className={`notif-dot tone-${n.severity}`} />
                            <div>
                              <strong>{n.title}</strong>
                              <small>{n.detail}</small>
                            </div>
                            <em>{n.time}</em>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Help / shortcuts ── */}
                <div className="topbar-dropdown-wrap">
                  <button className="help" onClick={() => { setIsHelpOpen((v) => !v); setIsNotifOpen(false); }} type="button">?</button>
                  {isHelpOpen && (
                    <div className="help-panel">
                      <header><span>Keyboard Shortcuts</span></header>
                      <div className="help-list">
                        {([
                          ["CMD + K",  "Open global search"],
                          ["CMD + S",  "Open QR scanner"],
                          ["CMD + N",  "New asset / QR label"],
                          ["CMD + I",  "Import spreadsheet"],
                          ["ESC",      "Close panels / search"],
                          ["↑ / ↓",   "Navigate list items"],
                        ] as [string, string][]).map(([key, desc]) => (
                          <div className="help-row" key={key}>
                            <kbd>{key}</kbd>
                            <span>{desc}</span>
                          </div>
                        ))}
                      </div>
                      <div className="help-footer">
                        <a href="https://dashboard-web-lime-omega.vercel.app" rel="noreferrer" target="_blank">Open full docs ↗</a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="user-chip">
                  <span>DM</span>
                  <div>
                    <strong>David M.</strong>
                    <small>Operations Lead</small>
                  </div>
                </div>
              </div>
            </header>

            <p className="action-notice">{actionNotice}</p>
          </>
        )}

        {activeNav === "Racks" ? (
          <RacksPage onOpenScanner={() => setIsScannerOpen(true)} />
        ) : activeNav === "Assets" ? (
          <AssetsInventoryPage
            savedAssets={savedAssets}
            onCreateAsset={() => {
              setSelectedAsset(null);
              setActiveNav("QR Studio");
            }}
            onAssetsImported={refreshSavedAssets}
            onOpenQrStudio={(asset) => {
              setSelectedAsset(asset);
              setActiveNav("QR Studio");
            }}
          />
        ) : activeNav === "Cables" ? (
          <CablesInventoryPage />
        ) : activeNav === "QR Studio" ? (
          <QRStudio initialAsset={selectedAsset} registryAssets={allAssets} onAssetsChanged={refreshSavedAssets} onOpenScanner={() => setIsScannerOpen(true)} />
        ) : activeNav === "Tickets" ? (
          <TicketsPage />
        ) : activeNav === "Technicians" ? (
          <TechniciansPage />
        ) : activeNav === "Map" ? (
          <MapPage onNavigateToRacks={() => setActiveNav("Racks")} />
        ) : activeNav === "Reports" ? (
          <ReportsPage />
        ) : activeNav === "Settings" ? (
          <SettingsPage />
        ) : activeNav === "Integrations" ? (
          <IntegrationsPage />
        ) : activeNav === "Audit Logs" ? (
          <AuditLogsPage />
        ) : (
          <>
            <section className="dashboard-grid command-dashboard-grid">
              <section className="qr-command-card">
                <div className="qr-command-copy">
                  <p>Operations Command</p>
                  <h1>Today&apos;s field plan</h1>
                  <span>Keep rack audits, QR labeling, fiber validation, and offline sync work moving from one command surface.</span>
                </div>
                <div className="qr-command-actions" aria-label="Primary field actions">
                  <button onClick={() => handleQuickAction(quickActions[0])} type="button">
                    <strong>Scan Asset</strong>
                    <span>Open QR scanner</span>
                  </button>
                  <button onClick={() => handleQuickAction(quickActions[1])} type="button">
                    <strong>Create Label</strong>
                    <span>New QR asset</span>
                  </button>
                  <button onClick={() => handleQuickAction(quickActions[5])} type="button">
                    <strong>Validate Fiber</strong>
                    <span>Run signal test</span>
                  </button>
                  <button onClick={() => handleQuickAction(quickActions[2])} type="button">
                    <strong>Import Assets</strong>
                    <span>Upload Excel / CSV</span>
                  </button>
                </div>
                <div className="qr-command-stats">
                  {qrCommandStats.map((stat) => (
                    <article key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.detail}</small>
                    </article>
                  ))}
                </div>
              </section>

              <section className="metric-strip command-metrics">
                {metrics.map((metric) => (
                  <article className="top-metric" key={metric.label}>
                    <div>
                      <p>{metric.label}</p>
                      <strong>{metric.value}</strong>
                      <span>{metric.delta}</span>
                    </div>
                    <em>{metric.icon}</em>
                  </article>
                ))}
              </section>

              <Card className="alerts-card" title="Attention Required" action="View All Alerts">
                <div className="alert-list">
                  {alerts.map((alert) => (
                    <button key={alert.label} type="button">
                      <strong>{alert.count}</strong>
                      <span>
                        <b>{alert.label}</b>
                        <small>{alert.detail}</small>
                      </span>
                      <em>{">"}</em>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="work-card-main service-desk-card" title="Service Desk Integrations" action="Configure">
                <div className="service-desk-copy">
                  <strong>Ticketing placeholder</strong>
                  <span>Prepare PatchPilot assets and QR scans to open or link external tickets later.</span>
                </div>
                <div className="service-provider-grid">
                  {serviceDeskProviders.map((provider) => (
                    <button key={provider.name} type="button">
                      <span>{provider.icon}</span>
                      <strong>{provider.name}</strong>
                      <small>{provider.detail}</small>
                      <em>{provider.status === "Ready" ? "Not connected" : "Planned"}</em>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="quick-actions-card" title="Quick Actions">
                <div className="quick-actions">
                  {quickActions.map((action) => (
                    <button key={action.id} onClick={() => handleQuickAction(action)} type="button">
                      <span className={`tone-${action.tone}`}>{action.icon}</span>
                      <strong>{action.title}</strong>
                      <small>{action.detail}</small>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="activity-card" title="Live Activity" action="View All">
                <div className="activity-list">
                  {visibleActivities.slice(0, 5).map((item) => (
                    <ActivityRow key={`${item.title}-${item.time}`} item={item} />
                  ))}
                </div>
              </Card>

              <Card className="rack-card-main" title="Rack Capacity Overview" action="View All Racks">
                <div className="rack-row">
                  {racks.map((rack) => (
                    <RackMiniCard key={rack.name} rack={rack} />
                  ))}
                </div>
              </Card>

              <Card className="technicians-card" title="Field Technicians" action="View All">
                <div className="technician-list">
                  {technicians.map((technician) => (
                    <TechnicianRow key={technician.name} technician={technician} />
                  ))}
                </div>
              </Card>

              <Card className="scans-card" title="Recent Scans" action="View All">
                <div className="scan-list">
                  {recentScans.map((scan) => (
                    <InfoRow key={`${scan.title}-${scan.time}`} title={scan.title} detail={scan.detail} time={scan.time} tone={scan.tone} />
                  ))}
                </div>
              </Card>

              <Card className="offline-card" title="Offline Status" action="View All">
                <div className="offline-list">
                  {offlineDevices.map((device) => (
                    <InfoRow key={device.title} title={device.title} detail={device.detail} time={device.status} tone={device.status === "Offline" ? "red" : "amber"} />
                  ))}
                </div>
              </Card>

              <Card className="health-card" title="System Health">
                <div className="health-content">
                  <div className="heartbeat" />
                  <p><span className="online-dot" />All systems operational</p>
                </div>
              </Card>
            </section>
          </>
        )}
        {isScannerOpen && (
          <QRScanModal message={scanMessage} onClose={() => setIsScannerOpen(false)} onResolved={(value) => void openAssetFromQrValue(value)} />
        )}
        {isFiberValidatorOpen && (
          <FiberSignalModal
            onClose={() => setIsFiberValidatorOpen(false)}
            onDetected={(result) => {
              setIsFiberValidatorOpen(false);
              const colorName = result.color === "red" ? "אדום 650nm" : result.color === "purple" ? "IR סגול (850–1550nm)" : "לבן VIS";
              setActionNotice(`אות לייזר זוהה (${colorName}${result.wavelengthHint ? ` — ${result.wavelengthHint}` : ""}). Fiber signal validation passed.`);
            }}
          />
        )}
      </section>
    </main>
  );
}

function SettingsPage() {
  type SettingsTab = "General" | "Scanner" | "Database" | "Security" | "Deployment";
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [assetIdPrefix, setAssetIdPrefix] = useState("PP-");
  const [labelSize, setLabelSize] = useState("50mm");
  const [qrErrorLevel, setQrErrorLevel] = useState("M");
  const [qrMargin, setQrMargin] = useState("1");
  const [scanThrottle, setScanThrottle] = useState("180");
  const [unknownQrFlow, setUnknownQrFlow] = useState("confirm");
  const [rfidEnabled, setRfidEnabled] = useState(false);
  const [requireScanConfirm, setRequireScanConfirm] = useState(true);
  const [offlineDb, setOfflineDb] = useState(true);
  const [autoMapHeaders, setAutoMapHeaders] = useState(true);
  const [supabaseEnabled, setSupabaseEnabled] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [assetsTable, setAssetsTable] = useState("assets");
  const [auditTable, setAuditTable] = useState("audit_events");
  const [syncInterval, setSyncInterval] = useState("30");
  const [auditRetention, setAuditRetention] = useState("90");
  const [allowCsvExport, setAllowCsvExport] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isDirty, setIsDirty] = useState(false);

  function markDirty() { setIsDirty(true); setSaveStatus("idle"); }
  function handleSave() {
    setSaveStatus("saving");
    setTimeout(() => { setSaveStatus("saved"); setIsDirty(false); }, 700);
    setTimeout(() => setSaveStatus("idle"), 3500);
  }

  const needsSetup = supabaseEnabled && !supabaseUrl ? 1 : 0;
  const enabledCount = [offlineDb, autoMapHeaders, allowCsvExport, requireScanConfirm].filter(Boolean).length + 3;
  const tabs: SettingsTab[] = ["General", "Scanner", "Database", "Security", "Deployment"];

  return (
    <section className="system-page settings-page">
      <header className="system-hero">
        <div>
          <p>System Control</p>
          <h1>Settings</h1>
          <span>Operational defaults for labels, scanning, imports, offline work, and cloud sync.</span>
        </div>
        <div className="system-hero-actions">
          {isDirty && <em className="settings-dirty-badge">Unsaved changes</em>}
          <button disabled={!isDirty || saveStatus === "saving"} onClick={handleSave} type="button">
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save Changes"}
          </button>
          <button type="button">Export Config</button>
        </div>
      </header>

      <section className="system-kpis">
        <article>
          <span>Enabled Controls</span>
          <strong>{enabledCount}</strong>
          <small>Production-ready settings</small>
        </article>
        <article className={needsSetup ? "warning" : ""}>
          <span>Needs Setup</span>
          <strong>{needsSetup}</strong>
          <small>{needsSetup ? "Cloud sync missing URL" : "All configured"}</small>
        </article>
        <article>
          <span>Label Profile</span>
          <strong>{labelSize}</strong>
          <small>QR-only print mode</small>
        </article>
        <article>
          <span>Scan Policy</span>
          <strong>{unknownQrFlow === "confirm" ? "Confirm" : unknownQrFlow === "auto" ? "Auto-create" : "Reject"}</strong>
          <small>Unknown QR/RFID flow</small>
        </article>
      </section>

      <nav className="settings-tab-bar ops-card">
        {tabs.map((tab) => (
          <button className={activeTab === tab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>
        ))}
      </nav>

      <div className="settings-body">
        {activeTab === "General" && (
          <div className="settings-tab-cols">
            <section className="ops-card settings-card">
              <header><h2>Identity &amp; Labels</h2></header>
              <div className="settings-fields">
                <div className="settings-row">
                  <div><strong>Asset ID Prefix</strong><span>Prepended to every auto-generated QR code ID</span></div>
                  <input className="settings-input" onChange={(e) => { setAssetIdPrefix(e.target.value); markDirty(); }} placeholder="PP-" value={assetIdPrefix} />
                </div>
                <div className="settings-row">
                  <div><strong>Label Print Size</strong><span>Physical size sent to label printer</span></div>
                  <select className="settings-select" onChange={(e) => { setLabelSize(e.target.value); markDirty(); }} value={labelSize}>
                    <option value="38mm">38mm square</option>
                    <option value="50mm">50mm square</option>
                    <option value="62mm">62mm square</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="settings-row">
                  <div><strong>QR Error Correction</strong><span>Higher = more robust, slightly larger code</span></div>
                  <select className="settings-select" onChange={(e) => { setQrErrorLevel(e.target.value); markDirty(); }} value={qrErrorLevel}>
                    <option value="L">L — 7% recovery</option>
                    <option value="M">M — 15% recovery</option>
                    <option value="Q">Q — 25% recovery</option>
                    <option value="H">H — 30% recovery</option>
                  </select>
                </div>
                <div className="settings-row">
                  <div><strong>QR Margin (modules)</strong><span>White border width around the code</span></div>
                  <input className="settings-input settings-input-sm" max="4" min="0" onChange={(e) => { setQrMargin(e.target.value); markDirty(); }} type="number" value={qrMargin} />
                </div>
              </div>
            </section>
            <section className="ops-card settings-card">
              <header><h2>Import</h2></header>
              <div className="settings-fields">
                <div className="settings-row">
                  <div><strong>Auto-map Headers</strong><span>Match English and Hebrew column names automatically on XLSX import</span></div>
                  <SettingsToggle checked={autoMapHeaders} onChange={(v) => { setAutoMapHeaders(v); markDirty(); }} />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "Scanner" && (
          <div className="settings-tab-cols">
            <section className="ops-card settings-card">
              <header><h2>QR &amp; RFID Scanner</h2></header>
              <div className="settings-fields">
                <div className="settings-row">
                  <div><strong>Scan Throttle (ms)</strong><span>Minimum delay between camera scan attempts — reduces CPU load</span></div>
                  <input className="settings-input settings-input-sm" max="500" min="50" onChange={(e) => { setScanThrottle(e.target.value); markDirty(); }} type="number" value={scanThrottle} />
                </div>
                <div className="settings-row">
                  <div><strong>Unknown QR/RFID Flow</strong><span>What happens when a scanned code has no matching asset</span></div>
                  <select className="settings-select" onChange={(e) => { setUnknownQrFlow(e.target.value); markDirty(); }} value={unknownQrFlow}>
                    <option value="confirm">Confirm before creating</option>
                    <option value="auto">Auto-create draft asset</option>
                    <option value="reject">Reject unknown codes</option>
                  </select>
                </div>
                <div className="settings-row">
                  <div><strong>Require Scan Confirmation</strong><span>Show confirmation dialog after each successful scan</span></div>
                  <SettingsToggle checked={requireScanConfirm} onChange={(v) => { setRequireScanConfirm(v); markDirty(); }} />
                </div>
                <div className="settings-row">
                  <div><strong>RFID Reader Support</strong><span>Enable RFID tag lookup alongside QR scanning</span></div>
                  <SettingsToggle checked={rfidEnabled} onChange={(v) => { setRfidEnabled(v); markDirty(); }} />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "Database" && (
          <div className="settings-tab-cols">
            <section className="ops-card settings-card">
              <header><h2>Local Storage</h2></header>
              <div className="settings-fields">
                <div className="settings-row">
                  <div><strong>Offline IndexedDB</strong><span>Browser-local asset registry for field work without internet</span></div>
                  <SettingsToggle checked={offlineDb} onChange={(v) => { setOfflineDb(v); markDirty(); }} />
                </div>
              </div>
            </section>
            <section className="ops-card settings-card">
              <header>
                <h2>Supabase Cloud Sync</h2>
                <SettingsToggle checked={supabaseEnabled} onChange={(v) => { setSupabaseEnabled(v); markDirty(); }} />
              </header>
              <div className="settings-fields">
                <div className={`settings-row${supabaseEnabled ? "" : " settings-row-disabled"}`}>
                  <div><strong>Project URL</strong><span>https://your-project.supabase.co</span></div>
                  <input className="settings-input" disabled={!supabaseEnabled} onChange={(e) => { setSupabaseUrl(e.target.value); markDirty(); }} placeholder="https://xxxx.supabase.co" value={supabaseUrl} />
                </div>
                <div className={`settings-row${supabaseEnabled ? "" : " settings-row-disabled"}`}>
                  <div><strong>Anon Key</strong><span>Public anon key from Project Settings → API</span></div>
                  <input className="settings-input" disabled={!supabaseEnabled} onChange={(e) => { setSupabaseKey(e.target.value); markDirty(); }} placeholder="eyJhbGciOiJIUzI1NiIsInR5c…" type="password" value={supabaseKey} />
                </div>
                <div className={`settings-row${supabaseEnabled ? "" : " settings-row-disabled"}`}>
                  <div><strong>Assets Table</strong><span>Postgres table name for asset records</span></div>
                  <input className="settings-input" disabled={!supabaseEnabled} onChange={(e) => { setAssetsTable(e.target.value); markDirty(); }} value={assetsTable} />
                </div>
                <div className={`settings-row${supabaseEnabled ? "" : " settings-row-disabled"}`}>
                  <div><strong>Audit Events Table</strong><span>Postgres table name for audit log entries</span></div>
                  <input className="settings-input" disabled={!supabaseEnabled} onChange={(e) => { setAuditTable(e.target.value); markDirty(); }} value={auditTable} />
                </div>
                <div className={`settings-row${supabaseEnabled ? "" : " settings-row-disabled"}`}>
                  <div><strong>Sync Interval (seconds)</strong><span>How often to push local changes to Supabase</span></div>
                  <input className="settings-input settings-input-sm" disabled={!supabaseEnabled} max="3600" min="10" onChange={(e) => { setSyncInterval(e.target.value); markDirty(); }} type="number" value={syncInterval} />
                </div>
              </div>
              {supabaseEnabled && (
                <div className="settings-test-row">
                  <button className="settings-test-btn" type="button">Test Connection</button>
                  <small>Enter URL and anon key above, then test before saving.</small>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "Security" && (
          <div className="settings-tab-cols">
            <section className="ops-card settings-card">
              <header><h2>Audit &amp; Compliance</h2></header>
              <div className="settings-fields">
                <div className="settings-row">
                  <div><strong>Log Retention (days)</strong><span>How long to keep audit events when cloud-backed</span></div>
                  <input className="settings-input settings-input-sm" max="365" min="7" onChange={(e) => { setAuditRetention(e.target.value); markDirty(); }} type="number" value={auditRetention} />
                </div>
                <div className="settings-row">
                  <div><strong>Allow CSV Export</strong><span>Permit operators to download asset and audit data as CSV</span></div>
                  <SettingsToggle checked={allowCsvExport} onChange={(v) => { setAllowCsvExport(v); markDirty(); }} />
                </div>
              </div>
            </section>
            <section className="ops-card settings-card settings-callout-card">
              <div className="settings-callout">
                <strong>No credentials stored in frontend</strong>
                <p>API keys and Supabase credentials are held only in browser memory for the current session. Use environment variables on the Vercel server for production deployments.</p>
              </div>
            </section>
          </div>
        )}

        {activeTab === "Deployment" && (
          <div className="settings-tab-cols">
            <section className="ops-card settings-card">
              <header><h2>Runtime Environment</h2></header>
              <div className="deployment-profile-full">
                {([["Framework","Vite + React"],["Node Version","22.x"],["Build Command","npm run build"],["Output Directory","dist"],["Deploy Target","Vercel"],["TypeScript","5.x strict"],["React Version","19.2.0"],["Offline Storage","IndexedDB (patchpilot_operations)"]] as [string,string][]).map(([k,v]) => (
                  <span key={k}><small>{k}</small><b>{v}</b></span>
                ))}
              </div>
            </section>
            <section className="ops-card settings-card">
              <header><h2>Environment Variables</h2></header>
              <div className="settings-env-table">
                <div className="settings-env-head"><span>Variable</span><span>Value</span><span>Status</span></div>
                {([
                  { key: "VITE_SUPABASE_URL", value: supabaseUrl || "Not set", set: Boolean(supabaseUrl) },
                  { key: "VITE_SUPABASE_ANON_KEY", value: supabaseKey ? "●●●●●●●●●●●●" : "Not set", set: Boolean(supabaseKey) },
                  { key: "VITE_ASSET_TABLE", value: assetsTable, set: true },
                  { key: "VITE_AUDIT_TABLE", value: auditTable, set: true },
                ] as {key:string;value:string;set:boolean}[]).map((env) => (
                  <div className="settings-env-row" key={env.key}>
                    <code>{env.key}</code>
                    <span className={env.set && env.value !== "Not set" ? "" : "env-unset"}>{env.value}</span>
                    <em className={`env-badge ${env.set && env.value !== "Not set" ? "env-ok" : "env-missing"}`}>{env.set && env.value !== "Not set" ? "Set" : "Missing"}</em>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

function IntegrationsPage() {
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, "idle" | "testing" | "ok" | "error">>({});
  const [fieldValues, setFieldValues] = useState<Record<string, Record<string, string>>>({});
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  function updateField(name: string, field: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [name]: { ...(prev[name] ?? {}), [field]: value } }));
  }
  function testConnection(name: string) {
    setTestStatus((prev) => ({ ...prev, [name]: "testing" }));
    setTimeout(() => {
      const hasVals = Object.values(fieldValues[name] ?? {}).some((v) => v.trim());
      setTestStatus((prev) => ({ ...prev, [name]: hasVals ? "ok" : "error" }));
    }, 1200);
  }
  function saveConnection(name: string) {
    setConnectedIds((prev) => new Set([...prev, name]));
    setConfiguringId(null);
    setTestStatus((prev) => ({ ...prev, [name]: "idle" }));
  }

  const connectedCount = connectedIds.size;

  return (
    <section className="system-page integrations-page">
      <header className="system-hero">
        <div>
          <p>Connection Hub</p>
          <h1>Integrations</h1>
          <span>Connect Supabase, ServiceNow, Jira, and custom webhooks to PatchPilot.</span>
        </div>
        <div className="system-hero-actions">
          <button type="button">Add Provider</button>
          <button type="button">Test All</button>
        </div>
      </header>

      <section className="system-kpis">
        <article>
          <span>Connected</span>
          <strong>{connectedCount}</strong>
          <small>Active integrations</small>
        </article>
        <article>
          <span>Ready to Configure</span>
          <strong>{Math.max(0, integrationProviders.filter((p) => p.status !== "Planned").length - connectedCount)}</strong>
          <small>Credentials not yet added</small>
        </article>
        <article>
          <span>Planned</span>
          <strong>{integrationProviders.filter((p) => p.status === "Planned").length}</strong>
          <small>On the integration roadmap</small>
        </article>
        <article className={connectedCount === 0 ? "warning" : ""}>
          <span>Sync Status</span>
          <strong>{connectedCount > 0 ? "Active" : "Local only"}</strong>
          <small>{connectedCount > 0 ? "Cloud sync enabled" : "No cloud connection"}</small>
        </article>
      </section>

      <div className="integration-list">
        {integrationProviders.map((provider) => {
          const isConfiguring = configuringId === provider.name;
          const isConnected = connectedIds.has(provider.name);
          const ts = testStatus[provider.name] ?? "idle";
          const vals = fieldValues[provider.name] ?? {};
          return (
            <article className={`ops-card int-card-v2${isConfiguring ? " expanded" : ""}${isConnected ? " connected" : ""}`} key={provider.name}>
              <div className="int-card-head">
                <div className="int-card-identity">
                  <span className="int-icon">{provider.icon}</span>
                  <div>
                    <h2>{provider.name}</h2>
                    <small>{provider.category}</small>
                  </div>
                </div>
                <div className="int-card-right">
                  {isConnected
                    ? <em className="int-badge-connected">Connected</em>
                    : <IntegrationStatusBadge status={provider.status} />}
                  {provider.status !== "Planned" && (
                    <button className={`int-configure-btn${isConfiguring ? " cancel" : ""}`} onClick={() => setConfiguringId(isConfiguring ? null : provider.name)} type="button">
                      {isConfiguring ? "Cancel" : isConnected ? "Reconfigure" : "Configure"}
                    </button>
                  )}
                </div>
              </div>

              <p className="int-desc">{provider.detail}</p>

              {isConfiguring ? (
                <div className="int-form">
                  <div className="int-form-fields">
                    {provider.fields.map((field) => {
                      const secret = /key|secret|token|password/i.test(field);
                      return (
                        <label className="int-form-label" key={field}>
                          <span>{field}</span>
                          <input onChange={(e) => updateField(provider.name, field, e.target.value)} placeholder={secret ? "●●●●●●●●●●●●" : `Enter ${field.toLowerCase()}…`} type={secret ? "password" : "text"} value={vals[field] ?? ""} />
                        </label>
                      );
                    })}
                  </div>
                  <div className="int-form-actions">
                    <button className={`int-test-btn${ts === "ok" ? " ok" : ts === "error" ? " error" : ""}`} onClick={() => testConnection(provider.name)} type="button">
                      {ts === "testing" ? "Testing…" : ts === "ok" ? "Connection OK ✓" : ts === "error" ? "Failed — check credentials" : "Test Connection"}
                    </button>
                    <button className="int-save-btn" onClick={() => saveConnection(provider.name)} type="button">Save &amp; Connect</button>
                  </div>
                  <div className="integration-next-step">
                    <small>{provider.category}</small>
                    <strong>{provider.nextStep}</strong>
                  </div>
                </div>
              ) : (
                <div className="int-fields-tags">
                  {provider.fields.map((f) => <span key={f}>{f}</span>)}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AuditLogsPage() {
  const PAGE_SIZE = 8;
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All Severity");
  const [sourceFilter, setSourceFilter] = useState("All Sources");
  const [actorFilter, setActorFilter] = useState("All Actors");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const sources = useMemo(() => Array.from(new Set(auditLogEntries.map((e) => e.source))).sort(), []);
  const actors  = useMemo(() => Array.from(new Set(auditLogEntries.map((e) => e.actor))).sort(), []);

  const filteredLogs = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return auditLogEntries.filter((entry) => {
      const matchesSearch = !needle || [entry.action, entry.target, entry.actor, entry.detail, entry.id].join(" ").toLowerCase().includes(needle);
      const matchesSeverity = severityFilter === "All Severity" || entry.severity === severityFilter;
      const matchesSource   = sourceFilter === "All Sources"   || entry.source === sourceFilter;
      const matchesActor    = actorFilter === "All Actors"     || entry.actor === actorFilter;
      return matchesSearch && matchesSeverity && matchesSource && matchesActor;
    });
  }, [searchQuery, severityFilter, sourceFilter, actorFilter]);

  useEffect(() => { setPage(0); }, [searchQuery, severityFilter, sourceFilter, actorFilter]);

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const pagedLogs  = filteredLogs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const warningCount = auditLogEntries.filter((e) => e.severity !== "Info").length;

  function exportCsv() {
    const header = "ID,Actor,Action,Target,Source,Severity,Time,Detail";
    const rows = filteredLogs.map((e) =>
      [e.id, e.actor, e.action, e.target, e.source, e.severity, e.time, e.detail.replace(/,/g, ";")]
        .map((v) => `"${v}"`).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `patchpilot-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    });
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  }

  return (
    <section className="system-page audit-page">
      <header className="system-hero">
        <div>
          <p>Operations Evidence</p>
          <h1>Audit Logs</h1>
          <span>Trace every scan, import, QR print, fiber test, sync event, and integration action.</span>
        </div>
        <div className="system-hero-actions">
          <button onClick={exportCsv} type="button">Export CSV</button>
          <button type="button">Retention Policy</button>
        </div>
      </header>

      <section className="system-kpis">
        <article>
          <span>Total Events</span>
          <strong>{auditLogEntries.length}</strong>
          <small>{filteredLogs.length} match current filters</small>
        </article>
        <article className={warningCount ? "warning" : ""}>
          <span>Needs Review</span>
          <strong>{warningCount}</strong>
          <small>Warnings and critical flags</small>
        </article>
        <article>
          <span>Sources</span>
          <strong>{sources.length}</strong>
          <small>{actors.length} unique actors</small>
        </article>
        <article>
          <span>Retention</span>
          <strong>90d</strong>
          <small>Configured in Settings</small>
        </article>
      </section>

      <section className="ops-card audit-filter-bar">
        <input className="audit-search" onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search events, actors, targets, event IDs…" value={searchQuery} />
        <select onChange={(e) => setSeverityFilter(e.target.value)} value={severityFilter}>
          <option>All Severity</option>
          <option>Info</option>
          <option>Warning</option>
          <option>Critical</option>
        </select>
        <select onChange={(e) => setSourceFilter(e.target.value)} value={sourceFilter}>
          <option>All Sources</option>
          {sources.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select onChange={(e) => setActorFilter(e.target.value)} value={actorFilter}>
          <option>All Actors</option>
          {actors.map((a) => <option key={a}>{a}</option>)}
        </select>
      </section>

      <section className="ops-card audit-log-card">
        <header>
          <h2>Event Trail</h2>
          <div className="audit-header-right">
            <span className="audit-count">{filteredLogs.length} events</span>
            {totalPages > 1 && (
              <div className="audit-pager-mini">
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} type="button">‹</button>
                <span>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} type="button">›</button>
              </div>
            )}
          </div>
        </header>

        <div className="audit-table">
          <div className="audit-head">
            <span>Event</span>
            <span>Actor</span>
            <span>Source</span>
            <span>Severity</span>
            <span>Time</span>
          </div>

          {pagedLogs.length === 0 && (
            <p className="audit-empty">No events match the current filters.</p>
          )}

          {pagedLogs.map((entry) => (
            <div key={entry.id}>
              <button className={`audit-row-btn${expandedId === entry.id ? " open" : ""}`} onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} type="button">
                <span>
                  <b>{entry.action}</b>
                  <small>{entry.id} / {entry.target}</small>
                </span>
                <span>{entry.actor}</span>
                <span>{entry.source}</span>
                <AuditSeverityBadge severity={entry.severity} />
                <span>{entry.time}</span>
              </button>
              {expandedId === entry.id && (
                <div className="audit-row-detail">
                  <p>{entry.detail}</p>
                  <div className="audit-row-meta">
                    <span><small>Event ID</small><b>{entry.id}</b></span>
                    <span><small>Target</small><b>{entry.target}</b></span>
                    <span><small>Actor</small><b>{entry.actor}</b></span>
                    <span><small>Source</small><b>{entry.source}</b></span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="audit-pagination">
            <button disabled={page === 0} onClick={() => setPage(0)} type="button">«</button>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} type="button">‹ Prev</button>
            <span>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} type="button">Next ›</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} type="button">»</button>
          </div>
        )}
      </section>
    </section>
  );
}

function SettingsToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button aria-checked={checked} className={`settings-toggle ${checked ? "on" : "off"}`} onClick={() => onChange(!checked)} role="switch" type="button">
      <span />
    </button>
  );
}

function SystemStatusBadge({ status }: { status: SystemHealthStatus }) {
  return <em className={`system-status ${status.toLowerCase()}`}>{status}</em>;
}

function IntegrationStatusBadge({ status }: { status: IntegrationProvider["status"] }) {
  return <em className={`integration-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</em>;
}

function AuditSeverityBadge({ severity }: { severity: AuditLogEntry["severity"] }) {
  return <em className={`audit-severity ${severity.toLowerCase()}`}>{severity}</em>;
}

function RacksPage({ onOpenScanner }: { onOpenScanner: () => void }) {
  const [selectedRack, setSelectedRack] = useState<RackRecord>(rackFleet[0]);
  const [selectedDevice, setSelectedDevice] = useState<RackDevice>(rackFleet[0].devices[1]);
  const [selectedCableId, setSelectedCableId] = useState("CBL-8812");
  const [rackQuery, setRackQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("All Sites");
  const [roomFilter, setRoomFilter] = useState("All Rooms");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [deviceFilter, setDeviceFilter] = useState("All Devices");

  const filteredRacks = useMemo(() => {
    return rackFleet.filter((rack) => {
      const text = `${rack.name} ${rack.site} ${rack.room} ${rack.row} ${rack.devices.map((device) => `${device.hostname} ${device.ip} ${device.qrId}`).join(" ")}`.toLowerCase();
      const matchesQuery = !rackQuery.trim() || text.includes(rackQuery.trim().toLowerCase());
      const matchesSite = siteFilter === "All Sites" || rack.site === siteFilter;
      const matchesRoom = roomFilter === "All Rooms" || rack.room === roomFilter;
      const matchesStatus = statusFilter === "All Status" || rack.health === statusFilter;
      const matchesDevice = deviceFilter === "All Devices" || rack.devices.some((device) => device.kind === deviceFilter);

      return matchesQuery && matchesSite && matchesRoom && matchesStatus && matchesDevice;
    });
  }, [deviceFilter, rackQuery, roomFilter, siteFilter, statusFilter]);

  const rowGroups = useMemo(() => {
    return filteredRacks.reduce<Record<string, RackRecord[]>>((groups, rack) => {
      const key = `${rack.site} / ${rack.room} / ${rack.row}`;
      groups[key] = [...(groups[key] ?? []), rack];
      return groups;
    }, {});
  }, [filteredRacks]);

  const fleetStats = useMemo(() => {
    const critical = filteredRacks.filter((rack) => rack.health === "Critical").length;
    const warning = filteredRacks.filter((rack) => rack.health === "Warning").length;
    const devices = filteredRacks.reduce((sum, rack) => sum + rack.devices.length, 0);
    const cables = filteredRacks.reduce((sum, rack) => sum + rack.cableCount, 0);
    const power = filteredRacks.reduce((sum, rack) => sum + rack.powerKw, 0);
    const capacity = filteredRacks.reduce((sum, rack) => sum + rack.powerCapacityKw, 0);

    return { critical, warning, devices, cables, power, capacity };
  }, [filteredRacks]);

  const selectedCable = selectedRack.cables.find((cable) => cable.id === selectedCableId) ?? selectedRack.cables[0];

  function openRack(rack: RackRecord) {
    setSelectedRack(rack);
    setSelectedDevice(rack.devices[0]);
    setSelectedCableId(rack.cables[0]?.id ?? "");
  }

  function selectPort(device: RackDevice, port: RackPort) {
    setSelectedDevice(device);
    if (port.cableId) setSelectedCableId(port.cableId);
  }

  return (
    <section className="racks-page">
      <header className="racks-hero">
        <div>
          <p>Infrastructure</p>
          <h1>Racks</h1>
          <span>Infrastructure topology and rack visibility</span>
        </div>
        <div className="racks-actions">
          <button type="button">Add Rack</button>
          <button onClick={onOpenScanner} type="button">Scan QR</button>
          <button type="button">Import Layout</button>
        </div>
      </header>

      <section className="rack-toolbar ops-card">
        <input value={rackQuery} onChange={(event) => setRackQuery(event.target.value)} placeholder="Search by QR, IP, hostname, rack, cable..." />
        <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
          <option>All Sites</option>
          <option>DC1</option>
          <option>DC2</option>
        </select>
        <select value={roomFilter} onChange={(event) => setRoomFilter(event.target.value)}>
          <option>All Rooms</option>
          <option>Room 3</option>
          <option>Room 4</option>
          <option>MDF</option>
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Status</option>
          <option>Healthy</option>
          <option>Warning</option>
          <option>Critical</option>
        </select>
        <select value={deviceFilter} onChange={(event) => setDeviceFilter(event.target.value)}>
          <option>All Devices</option>
          <option>Switch</option>
          <option>Server</option>
          <option>Patch Panel</option>
          <option>Storage</option>
          <option>PDU</option>
          <option>UPS</option>
        </select>
      </section>

      <section className="dc-command-strip">
        <article>
          <span>Total Racks</span>
          <strong>{filteredRacks.length}</strong>
          <small>{Object.keys(rowGroups).length} physical rows</small>
        </article>
        <article>
          <span>Active Devices</span>
          <strong>{fleetStats.devices}</strong>
          <small>QR-linked inventory</small>
        </article>
        <article>
          <span>Cable Plant</span>
          <strong>{fleetStats.cables.toLocaleString()}</strong>
          <small>Fiber / DAC / copper</small>
        </article>
        <article>
          <span>Power Load</span>
          <strong>{fleetStats.power.toFixed(1)} kW</strong>
          <small>{Math.round((fleetStats.power / fleetStats.capacity) * 100)}% of modeled capacity</small>
        </article>
        <article className={fleetStats.critical ? "critical" : fleetStats.warning ? "warning" : ""}>
          <span>Exceptions</span>
          <strong>{fleetStats.critical + fleetStats.warning}</strong>
          <small>{fleetStats.critical} critical / {fleetStats.warning} warning</small>
        </article>
      </section>

      <section className="dc-topology ops-card">
        <header>
          <div>
            <h2>Room Topology</h2>
            <span>Physical rack rows, health, power pressure, and open capacity</span>
          </div>
          <div className="topology-legend">
            <span><i className="healthy" />Healthy</span>
            <span><i className="warning" />Warning</span>
            <span><i className="critical" />Critical</span>
          </div>
        </header>
        <div className="topology-rows">
          {Object.entries(rowGroups).map(([rowName, rowRacks]) => (
            <div className="topology-row" key={rowName}>
              <strong>{rowName}</strong>
              <div>
                {rowRacks.map((rack) => (
                  <button className={`${rack.health.toLowerCase()} ${selectedRack.id === rack.id ? "active" : ""}`} key={rack.id} onClick={() => openRack(rack)} type="button">
                    <span>{rack.name.replace("RACK-", "")}</span>
                    <small>{Math.round((rack.powerKw / rack.powerCapacityKw) * 100)}%</small>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="racks-workspace">
        <section className="rack-grid">
          {filteredRacks.map((rack) => (
            <button className={`rack-card ${selectedRack.id === rack.id ? "selected" : ""}`} key={rack.id} onClick={() => openRack(rack)} type="button">
              <div className="rack-card-head">
                <span>
                  <strong>{rack.name}</strong>
                  <small>{rack.site} / {rack.room}</small>
                </span>
                <HealthBadge health={rack.health} />
              </div>
              <MiniRackPreview rack={rack} />
              <div className="rack-metrics">
                <span><b>{rack.temperature.toFixed(1)} C</b><small>Temp</small></span>
                <span><b>{rack.powerKw.toFixed(1)} kW</b><small>Power</small></span>
                <span><b>{rack.devices.length}</b><small>Devices</small></span>
                <span><b>{rack.cableCount}</b><small>Cables</small></span>
              </div>
            </button>
          ))}
        </section>

        <aside className="rack-panel ops-card">
          <header>
            <div>
              <h2>{selectedRack.name}</h2>
              <span>{selectedRack.site} / {selectedRack.room} / {selectedRack.row}</span>
            </div>
            <HealthBadge health={selectedRack.health} />
          </header>

          <div className="rack-panel-grid">
            <section className="rack-elevation-wrap">
              <div className="rack-elevation-head">
                <strong>Rack Elevation</strong>
                <span>42U front view</span>
              </div>
              <RackElevation rack={selectedRack} selectedDevice={selectedDevice} selectedCableId={selectedCableId} onSelectDevice={setSelectedDevice} onSelectPort={selectPort} />
            </section>

            <section className="rack-detail-stack">
              <div className="cable-trace-card">
                <div>
                  <strong>Cable Trace</strong>
                  <span>{selectedCable ? `${selectedCable.type} / ${selectedCable.connector}` : "Select a connected port"}</span>
                </div>
                {selectedCable ? (
                  <div className="trace-line">
                    <b>{selectedCable.fromDevice}</b>
                    <em>{selectedCable.fromPort}</em>
                    <span>{selectedCable.id}</span>
                    <em>{selectedCable.toPort}</em>
                    <b>{selectedCable.destination}</b>
                  </div>
                ) : (
                  <p>No active cable selected.</p>
                )}
              </div>

              <DeviceDetails device={selectedDevice} selectedCableId={selectedCableId} />

              <div className="future-tools">
                {["AI infrastructure insights", "Rack heatmap", "Power monitoring", "Cable validation", "Topology mode", "Search by QR/IP/hostname"].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </section>
  );
}

function HealthBadge({ health }: { health: RackHealth }) {
  return <em className={`rack-health ${health.toLowerCase()}`}><i />{health}</em>;
}

function MiniRackPreview({ rack }: { rack: RackRecord }) {
  return (
    <div className="mini-rack-preview">
      {Array.from({ length: 18 }).map((_, index) => {
        const u = 42 - Math.floor(index * (42 / 18));
        const device = rack.devices.find((item) => u <= item.startU && u > item.startU - item.heightU);
        return <span className={device ? `device-${device.kind.toLowerCase().replace(" ", "-")}` : ""} key={`${rack.id}-${u}`} />;
      })}
    </div>
  );
}

function RackElevation({ rack, selectedDevice, selectedCableId, onSelectDevice, onSelectPort }: { rack: RackRecord; selectedDevice: RackDevice; selectedCableId: string; onSelectDevice: (device: RackDevice) => void; onSelectPort: (device: RackDevice, port: RackPort) => void }) {
  return (
    <div className="rack-elevation">
      {Array.from({ length: 42 }).map((_, index) => {
        const u = 42 - index;
        const device = rack.devices.find((item) => u <= item.startU && u > item.startU - item.heightU);
        const isDeviceTop = device?.startU === u;

        return (
          <div className="rack-u-row" key={`${rack.id}-${u}`}>
            <span className="rack-u-label">U{u}</span>
            {device && isDeviceTop ? (
              <button
                className={`rack-device device-${device.kind.toLowerCase().replace(" ", "-")} ${selectedDevice.id === device.id ? "active" : ""}`}
                onClick={() => onSelectDevice(device)}
                style={{ gridRow: `span ${device.heightU}` }}
                title={`${device.hostname} / ${device.ip} / ${device.qrId}`}
                type="button"
              >
                <span className={`device-led ${device.status.toLowerCase()}`} />
                <strong>{device.hostname}</strong>
                <small>{device.kind} / {device.ip}</small>
                <div className="device-ports">
                  {device.ports.map((port) => (
                    <i
                      className={port.cableId === selectedCableId ? "linked" : ""}
                      key={port.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectPort(device, port);
                      }}
                      title={`${port.label} / ${port.connector}${port.cableId ? ` / ${port.cableId}` : ""}`}
                    >
                      {port.label}
                    </i>
                  ))}
                </div>
                <em>QR</em>
              </button>
            ) : !device ? (
              <span className="rack-empty-space" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DeviceDetails({ device, selectedCableId }: { device: RackDevice; selectedCableId: string }) {
  return (
    <section className="device-detail-card">
      <header>
        <div>
          <h3>{device.hostname}</h3>
          <span>{device.kind} / U{device.startU}</span>
        </div>
        <span className={`device-led ${device.status.toLowerCase()}`} />
      </header>
      <div className="device-detail-grid">
        <span><small>Management IP</small><b>{device.ip}</b></span>
        <span><small>Serial</small><b>{device.serial}</b></span>
        <span><small>QR Code</small><b>{device.qrId}</b></span>
        <span><small>Last Updated</small><b>{device.lastUpdated}</b></span>
        <span><small>Technician</small><b>{device.technician}</b></span>
        <span><small>VLANs</small><b>{device.vlans.join(", ")}</b></span>
      </div>
      <div className="connected-ports">
        {device.ports.map((port) => (
          <span className={port.cableId === selectedCableId ? "active" : ""} key={port.id}>{port.label} / {port.connector}{port.cableId ? ` / ${port.cableId}` : ""}</span>
        ))}
      </div>
      <div className="device-actions">
        <button onClick={() => void navigator.clipboard?.writeText(device.ip)} type="button">Copy IP</button>
        <button type="button">Open Console</button>
        <button type="button">Generate QR</button>
      </div>
    </section>
  );
}

function AssetsInventoryPage({
  savedAssets,
  onCreateAsset,
  onAssetsImported,
  onOpenQrStudio
}: {
  savedAssets: AssetRecord[];
  onCreateAsset: () => void;
  onAssetsImported: () => Promise<void>;
  onOpenQrStudio: (asset: AssetRecord) => void;
}) {
  const assetRows = useMemo(() => {
    const byId = new Map<string, AssetRecord>();
    demoAssetInventory.forEach((asset) => byId.set(asset.id, asset));
    savedAssets.forEach((asset) => byId.set(asset.id, asset));
    return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [savedAssets]);

  const [selectedAssetId, setSelectedAssetId] = useState(assetRows[0]?.id ?? demoAssetInventory[0].id);
  const [assetQuery, setAssetQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [siteFilter, setSiteFilter] = useState("All Sites");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sites = useMemo(() => Array.from(new Set(assetRows.map((asset) => asset.site).filter(Boolean))).sort(), [assetRows]);

  const filteredAssets = useMemo(() => {
    const needle = assetQuery.trim().toLowerCase();

    return assetRows.filter((asset) => {
      const searchable = [
        asset.id,
        asset.qrCode,
        asset.assetType,
        asset.name,
        asset.serial,
        asset.status,
        asset.site,
        asset.room,
        asset.rack,
        asset.ruPosition,
        asset.ipAddress,
        asset.macAddress,
        asset.vlan,
        asset.switchPort,
        asset.owner,
        asset.tags,
        asset.notes
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !needle || searchable.includes(needle);
      const assetCategory = getAssetCategory(asset);
      const matchesCategory = categoryFilter === "All Categories" || assetCategory === categoryFilter;
      const matchesSite = siteFilter === "All Sites" || asset.site === siteFilter;
      const matchesStatus = statusFilter === "All Status" || asset.status === statusFilter;

      return matchesQuery && matchesCategory && matchesSite && matchesStatus;
    });
  }, [assetQuery, assetRows, categoryFilter, siteFilter, statusFilter]);

  const selectedAsset = filteredAssets.find((asset) => asset.id === selectedAssetId) ?? filteredAssets[0] ?? assetRows[0] ?? demoAssetInventory[0];

  const categoryGroups = useMemo(() => {
    const visibleCategories = categoryFilter === "All Categories"
      ? assetCategories
      : assetCategories.filter((category) => category === categoryFilter);

    return visibleCategories.map((category) => ({
      category,
      assets: filteredAssets.filter((asset) => getAssetCategory(asset) === category)
    }));
  }, [categoryFilter, filteredAssets]);

  const assetStats = useMemo(() => {
    const active = filteredAssets.filter((asset) => asset.status === "Active" || asset.status === "In Service").length;
    const attention = filteredAssets.filter((asset) => asset.status === "Maintenance" || asset.status === "Offline").length;
    const qrLinked = filteredAssets.filter((asset) => asset.qrCode).length;
    const racksCount = new Set(filteredAssets.map((asset) => asset.rack).filter(Boolean)).size;
    const ownersCount = new Set(filteredAssets.map((asset) => asset.owner).filter(Boolean)).size;

    return { active, attention, qrLinked, racksCount, ownersCount };
  }, [filteredAssets]);

  const attentionAssets = useMemo(() => assetRows.filter((asset) => asset.status === "Maintenance" || asset.status === "Offline" || !asset.qrCode), [assetRows]);

  async function importAssetFile(file: File) {
    setImportMessage(`Importing ${file.name}...`);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        setImportMessage("No worksheet found in this file.");
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<ImportedAssetRow>(sheet, { defval: "", raw: false });
      const importedAssets = rows
        .map((row, index) => createAssetFromImportedRow(row, index))
        .filter((asset): asset is AssetRecord => Boolean(asset));

      if (!importedAssets.length) {
        setImportMessage("No importable asset rows found. Check the header row.");
        return;
      }

      const database = await getAssetDatabase();
      await Promise.all(importedAssets.map((asset) => database.put(asset)));
      await onAssetsImported();
      setSelectedAssetId(importedAssets[0].id);
      setAssetQuery("");
      setCategoryFilter("All Categories");
      setImportMessage(`Imported ${importedAssets.length} assets. Each row now has a printable QR.`);
    } catch {
      setImportMessage("Import failed. Use .xlsx, .xls, or .csv with a clear header row.");
    }
  }

  function handleAssetImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void importAssetFile(file);
  }

  return (
    <section className="assets-page">
      <header className="racks-hero assets-hero">
        <div>
          <p>Inventory</p>
          <h1>Assets</h1>
          <span>Operational asset registry for devices, racks, panels, power and storage</span>
        </div>
        <div className="racks-actions">
          <button onClick={onCreateAsset} type="button">Add Asset</button>
          <button onClick={() => fileInputRef.current?.click()} type="button">Bulk Import</button>
          <button type="button">Export CSV</button>
          <input
            ref={fileInputRef}
            accept=".xlsx,.xls,.csv"
            className="asset-import-input"
            onChange={handleAssetImport}
            type="file"
          />
        </div>
      </header>

      {importMessage && <p className="asset-import-message">{importMessage}</p>}

      <section className="dc-command-strip assets-kpis">
        <article>
          <span>Total Assets</span>
          <strong>{filteredAssets.length}</strong>
          <small>{assetRows.length} in registry</small>
        </article>
        <article>
          <span>Active / Service</span>
          <strong>{assetStats.active}</strong>
          <small>Ready for operations</small>
        </article>
        <article className={assetStats.attention ? "warning" : ""}>
          <span>Needs Attention</span>
          <strong>{assetStats.attention}</strong>
          <small>Maintenance, offline, or QR gap</small>
        </article>
        <article>
          <span>QR Linked</span>
          <strong>{assetStats.qrLinked}</strong>
          <small>Scannable asset tags</small>
        </article>
        <article>
          <span>Racks / Owners</span>
          <strong>{assetStats.racksCount} / {assetStats.ownersCount}</strong>
          <small>Physical coverage</small>
        </article>
      </section>

      <section className="rack-toolbar assets-toolbar ops-card">
        <input value={assetQuery} onChange={(event) => setAssetQuery(event.target.value)} placeholder="Search QR, serial, hostname, rack, IP, MAC..." />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option>All Categories</option>
          {assetCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)}>
          <option>All Sites</option>
          {sites.map((site) => (
            <option key={site}>{site}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Status</option>
          <option>Active</option>
          <option>In Service</option>
          <option>In Stock</option>
          <option>Maintenance</option>
          <option>Offline</option>
          <option>Retired</option>
        </select>
      </section>

      <div className="assets-workspace">
        <section className="ops-card assets-table-card">
          <header>
            <h2>Asset Registry</h2>
            <button type="button">{filteredAssets.length} records</button>
          </header>
          <div className="assets-table">
            {categoryGroups.map((group) => (
              <section className="asset-category-section" key={group.category}>
                <header>
                  <div>
                    <h3>{group.category}</h3>
                    <span>{group.assets.length} records</span>
                  </div>
                  <small>{group.category === "GBICs" ? "Optics / transceivers" : group.category === "Cables" ? "Fiber, copper, DAC" : group.category === "Servers" ? "Compute nodes" : "Switches, racks, panels, storage, power"}</small>
                </header>

                {group.assets.length ? (
                  <div className="asset-category-list">
                    {group.assets.map((asset) => (
                      <button className={selectedAsset.id === asset.id ? "active" : ""} key={asset.id} onClick={() => setSelectedAssetId(asset.id)} type="button">
                        <span>
                          <b>{asset.name || asset.id}</b>
                          <small>{asset.id} / {asset.assetType}</small>
                        </span>
                        <span>
                          <b>{asset.rack || asset.site || "No location"}</b>
                          <small>{asset.room || asset.ruPosition || asset.owner || "No room"}</small>
                        </span>
                        <span>
                          <b>{asset.connectorType || asset.cableType || asset.ipAddress || "No connector"}</b>
                          <small>{asset.serial || asset.switchPort || asset.macAddress || "No serial"}</small>
                        </span>
                        <AssetStatusBadge status={asset.status} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="asset-category-empty">No matching records in this category.</div>
                )}
              </section>
            ))}
          </div>
        </section>

        <aside className="ops-card asset-detail-panel">
          <header>
            <div>
              <h2>{selectedAsset.name || selectedAsset.id}</h2>
              <span>{selectedAsset.assetType} / {selectedAsset.id}</span>
            </div>
            <AssetStatusBadge status={selectedAsset.status} />
          </header>

          <div className="asset-identity-card">
            <div className="asset-qr-mark">QR</div>
            <div>
              <strong>{selectedAsset.qrCode || "Missing QR"}</strong>
              <span>{getQrPayload(selectedAsset)}</span>
            </div>
          </div>

          <div className="asset-detail-grid">
            <span><small>Serial</small><b>{selectedAsset.serial || "Not set"}</b></span>
            <span><small>Owner</small><b>{selectedAsset.owner || "Unassigned"}</b></span>
            <span><small>Site</small><b>{selectedAsset.site || "No site"}</b></span>
            <span><small>Room</small><b>{selectedAsset.room || "No room"}</b></span>
            <span><small>Rack</small><b>{selectedAsset.rack || "No rack"}</b></span>
            <span><small>RU Position</small><b>{selectedAsset.ruPosition || "No RU"}</b></span>
            <span><small>IP Address</small><b>{selectedAsset.ipAddress || "No IP"}</b></span>
            <span><small>MAC / Port</small><b>{selectedAsset.macAddress || selectedAsset.switchPort || "No mapping"}</b></span>
            <span><small>VLAN</small><b>{selectedAsset.vlan || "No VLAN"}</b></span>
            <span><small>Cable / Connector</small><b>{[selectedAsset.cableType, selectedAsset.connectorType].filter(Boolean).join(" / ") || "No link"}</b></span>
          </div>

          <section className="asset-notes-card">
            <strong>Operational Notes</strong>
            <p>{selectedAsset.notes || "No notes captured yet."}</p>
            <small>Updated {new Date(selectedAsset.updatedAt).toLocaleString()}</small>
          </section>

          <div className="asset-actions">
            <button onClick={() => onOpenQrStudio(selectedAsset)} type="button">Open QR Studio</button>
            <button type="button">Create Work Order</button>
            <button type="button">Print Label</button>
          </div>

          <section className="asset-attention-list">
            <header>
              <strong>Attention Queue</strong>
              <span>{attentionAssets.length} items</span>
            </header>
            {attentionAssets.slice(0, 5).map((asset) => (
              <button key={asset.id} onClick={() => setSelectedAssetId(asset.id)} type="button">
                <span>
                  <b>{asset.name || asset.id}</b>
                  <small>{asset.rack || asset.site || "No location"} / {asset.assetType}</small>
                </span>
                <em>{asset.status}</em>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </section>
  );
}

function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return <em className={`asset-status ${status.toLowerCase().replace(" ", "-")}`}>{status}</em>;
}

function CablesInventoryPage() {
  const [selectedItemId, setSelectedItemId] = useState(cableInventory[0].id);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Types");
  const [vendorFilter, setVendorFilter] = useState("All Vendors");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const vendors = useMemo(() => Array.from(new Set(cableInventory.map((item) => item.vendor))).sort(), []);

  const filteredItems = useMemo(() => {
    const needle = inventoryQuery.trim().toLowerCase();

    return cableInventory.filter((item) => {
      const searchable = [item.sku, item.category, item.type, item.vendor, item.connector, item.speed, item.location, item.bin, item.status, item.notes].join(" ").toLowerCase();
      const matchesQuery = !needle || searchable.includes(needle);
      const matchesCategory = categoryFilter === "All Types" || item.category === categoryFilter;
      const matchesVendor = vendorFilter === "All Vendors" || item.vendor === vendorFilter;
      const matchesStatus = statusFilter === "All Status" || item.status === statusFilter;

      return matchesQuery && matchesCategory && matchesVendor && matchesStatus;
    });
  }, [categoryFilter, inventoryQuery, statusFilter, vendorFilter]);

  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? cableInventory[0];

  const inventoryStats = useMemo(() => {
    const totalUnits = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
    const lowStock = filteredItems.filter((item) => item.quantity < item.minimum || item.status === "Low Stock").length;
    const transceivers = filteredItems.filter((item) => item.category === "Transceiver").reduce((sum, item) => sum + item.quantity, 0);
    const reserved = filteredItems.filter((item) => item.status === "Reserved").reduce((sum, item) => sum + item.quantity, 0);
    const vendorsCount = new Set(filteredItems.map((item) => item.vendor)).size;

    return { totalUnits, lowStock, transceivers, reserved, vendorsCount };
  }, [filteredItems]);

  const reorderItems = useMemo(() => cableInventory.filter((item) => item.quantity < item.minimum || item.status === "Low Stock"), []);

  return (
    <section className="cables-page">
      <header className="racks-hero cables-hero">
        <div>
          <p>Inventory</p>
          <h1>Cables & GBICs</h1>
          <span>Stock control for fiber, DAC, copper, SFP and QSFP optics</span>
        </div>
        <div className="racks-actions">
          <button type="button">Add Item</button>
          <button type="button">Cycle Count</button>
          <button type="button">Export CSV</button>
        </div>
      </header>

      <section className="dc-command-strip cables-kpis">
        <article>
          <span>Total Units</span>
          <strong>{inventoryStats.totalUnits.toLocaleString()}</strong>
          <small>{filteredItems.length} active SKUs</small>
        </article>
        <article className={inventoryStats.lowStock ? "warning" : ""}>
          <span>Low Stock</span>
          <strong>{inventoryStats.lowStock}</strong>
          <small>Below minimum or reorder flagged</small>
        </article>
        <article>
          <span>GBIC / Optics</span>
          <strong>{inventoryStats.transceivers}</strong>
          <small>SFP, SFP+, QSFP and QSFP28</small>
        </article>
        <article>
          <span>Reserved</span>
          <strong>{inventoryStats.reserved}</strong>
          <small>Held for planned work</small>
        </article>
        <article>
          <span>Vendors</span>
          <strong>{inventoryStats.vendorsCount}</strong>
          <small>Filtered supplier set</small>
        </article>
      </section>

      <section className="rack-toolbar cables-toolbar ops-card">
        <input value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} placeholder="Search SKU, vendor, speed, connector, bin..." />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option>All Types</option>
          <option>Fiber</option>
          <option>DAC</option>
          <option>Copper</option>
          <option>Transceiver</option>
        </select>
        <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)}>
          <option>All Vendors</option>
          {vendors.map((vendor) => (
            <option key={vendor}>{vendor}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Status</option>
          <option>In Stock</option>
          <option>Low Stock</option>
          <option>Reserved</option>
          <option>Deployed</option>
          <option>Quarantine</option>
        </select>
      </section>

      <div className="cables-workspace">
        <section className="ops-card cables-table-card">
          <header>
            <h2>Inventory Ledger</h2>
            <button type="button">{filteredItems.length} SKUs</button>
          </header>
          <div className="cables-table">
            <div className="cables-head">
              <span>SKU</span>
              <span>Type</span>
              <span>Vendor</span>
              <span>Speed</span>
              <span>Qty</span>
              <span>Status</span>
            </div>
            {filteredItems.map((item) => (
              <button className={selectedItem.id === item.id ? "active" : ""} key={item.id} onClick={() => setSelectedItemId(item.id)} type="button">
                <span>
                  <b>{item.sku}</b>
                  <small>{item.bin} / {item.location}</small>
                </span>
                <span>
                  <b>{item.category}</b>
                  <small>{item.connector} / {item.length}</small>
                </span>
                <span>{item.vendor}</span>
                <span>{item.speed}</span>
                <span className={item.quantity < item.minimum ? "qty-low" : ""}>
                  <b>{item.quantity}</b>
                  <small>min {item.minimum}</small>
                </span>
                <InventoryStatusBadge status={item.status} />
              </button>
            ))}
          </div>
        </section>

        <aside className="ops-card cable-detail-panel">
          <header>
            <div>
              <h2>{selectedItem.sku}</h2>
              <span>{selectedItem.type}</span>
            </div>
            <InventoryStatusBadge status={selectedItem.status} />
          </header>

          <div className="stock-meter">
            <div>
              <strong>{selectedItem.quantity}</strong>
              <span>available units</span>
            </div>
            <div className="stock-track">
              <span style={{ width: `${Math.min(100, Math.round((selectedItem.quantity / Math.max(selectedItem.minimum * 2, 1)) * 100))}%` }} />
            </div>
            <small>Minimum stock: {selectedItem.minimum}</small>
          </div>

          <div className="cable-detail-grid">
            <span><small>Category</small><b>{selectedItem.category}</b></span>
            <span><small>Vendor</small><b>{selectedItem.vendor}</b></span>
            <span><small>Connector</small><b>{selectedItem.connector}</b></span>
            <span><small>Speed</small><b>{selectedItem.speed}</b></span>
            <span><small>Length / Reach</small><b>{selectedItem.length}</b></span>
            <span><small>Bin</small><b>{selectedItem.bin}</b></span>
            <span><small>Location</small><b>{selectedItem.location}</b></span>
            <span><small>Owner</small><b>{selectedItem.owner}</b></span>
          </div>

          <section className="cable-notes">
            <strong>Handling Notes</strong>
            <p>{selectedItem.notes}</p>
            <small>Last counted: {selectedItem.lastCounted}</small>
          </section>

          <section className="reorder-list">
            <header>
              <strong>Reorder Watch</strong>
              <span>{reorderItems.length} items</span>
            </header>
            {reorderItems.slice(0, 5).map((item) => (
              <button key={item.id} onClick={() => setSelectedItemId(item.id)} type="button">
                <span>
                  <b>{item.sku}</b>
                  <small>{item.vendor} / {item.connector}</small>
                </span>
                <em>{item.quantity} / {item.minimum}</em>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </section>
  );
}

function InventoryStatusBadge({ status }: { status: CableInventoryStatus }) {
  return <em className={`inventory-status ${status.toLowerCase().replace(" ", "-")}`}>{status}</em>;
}

function QRScanModal({
  message,
  onClose,
  onResolved
}: {
  message: string;
  onClose: () => void;
  onResolved: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const isResolvedRef = useRef(false);
  const lastScanRef = useRef(0);
  const [manualValue, setManualValue] = useState("");
  const [scannerStatus, setScannerStatus] = useState("Starting camera...");

  useEffect(() => {
    let isMounted = true;

    function stopCamera() {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    async function startCamera() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !navigator.mediaDevices?.getUserMedia) {
        setScannerStatus("Camera scanning is not available in this browser. Enter the QR ID manually.");
        return;
      }

      if (!window.isSecureContext) {
        setScannerStatus("Camera access needs HTTPS on iPhone. Manual QR ID entry is available below.");
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        setScannerStatus("Camera ready. Hold a PatchPilot QR label inside the frame.");

        const BarcodeDetector = getBarcodeDetectorConstructor();
        const detector = BarcodeDetector ? new BarcodeDetector({ formats: ["qr_code"] }) : null;
        const context = canvas.getContext("2d", { willReadFrequently: true });

        const scanFrame = async () => {
          if (!isMounted || isResolvedRef.current) return;

          const now = window.performance.now();
          if (now - lastScanRef.current < 180) {
            frameRef.current = window.requestAnimationFrame(() => void scanFrame());
            return;
          }

          lastScanRef.current = now;

          try {
            if (detector) {
              const results = await detector.detect(video);
              const value = results[0]?.rawValue;

              if (value) {
                isResolvedRef.current = true;
                stopCamera();
                onResolved(value);
                return;
              }
            } else if (context && video.videoWidth && video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              const result = jsQR(imageData.data, imageData.width, imageData.height);

              if (result?.data) {
                isResolvedRef.current = true;
                stopCamera();
                onResolved(result.data);
                return;
              }
            }
          } catch {
            setScannerStatus("Scanning paused. Try better light or enter the QR ID manually.");
          }

          frameRef.current = window.requestAnimationFrame(() => void scanFrame());
        };

        frameRef.current = window.requestAnimationFrame(() => void scanFrame());
      } catch {
        setScannerStatus("Camera permission was blocked. On iPhone use HTTPS, or enter the QR ID manually.");
      }
    }

    void startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [onResolved]);

  function submitManualValue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = manualValue.trim();

    if (!value) {
      setScannerStatus("Enter a QR ID or PatchPilot QR URL.");
      return;
    }

    isResolvedRef.current = true;
    onResolved(value);
  }

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" aria-label="Scan PatchPilot QR">
      <section className="scanner-panel">
        <header>
          <div>
            <p>PatchPilot Scanner</p>
            <h2>Scan QR</h2>
            <span>{message}</span>
          </div>
          <button onClick={onClose} type="button">Close</button>
        </header>

        <div className="scanner-camera">
          <video ref={videoRef} muted playsInline />
          <canvas ref={canvasRef} aria-hidden="true" />
          <div className="scanner-frame">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="scanner-status">
          <strong>{scannerStatus}</strong>
          <small>Supported values: PP-000128, patchpilot://asset/PP-000128, or https://app.patchpilot.io/a/PP-000128</small>
        </div>

        <form className="scanner-manual" onSubmit={submitManualValue}>
          <input value={manualValue} onChange={(event) => setManualValue(event.target.value)} placeholder="Enter QR ID manually..." />
          <button type="submit">Open Asset</button>
        </form>
      </section>
    </div>
  );
}

function FiberSignalModal({
  onClose,
  onDetected
}: {
  onClose: () => void;
  onDetected: (result: FiberSignalResult) => void;
}) {
  const videoRef   = useRef<HTMLVideoElement | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const frameRef   = useRef<number | null>(null);
  const stableRef  = useRef(0);

  type LiveStatus = "waiting" | "signal" | "no-signal";
  const [camReady, setCamReady]       = useState(false);
  const [live, setLive]               = useState<LiveStatus>("waiting");
  const [liveResult, setLiveResult]   = useState<FiberSignalResult | null>(null);
  const [camError, setCamError]       = useState("");

  useEffect(() => {
    let isMounted = true;

    function stopCamera() {
      if (frameRef.current) { window.cancelAnimationFrame(frameRef.current); frameRef.current = null; }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    async function startCamera() {
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !navigator.mediaDevices?.getUserMedia) {
        setCamError("Camera not available in this browser."); return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (!isMounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        video.srcObject   = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        setCamReady(true);

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        let skip  = 0;

        const scan = () => {
          if (!isMounted) return;
          skip++;
          if (ctx && video.videoWidth && video.videoHeight && skip % 2 === 0) {
            canvas.width  = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const result = detectFiberSignal(ctx.getImageData(0, 0, canvas.width, canvas.height));

            if (result) {
              stableRef.current = Math.min(stableRef.current + 1, 10);
              if (stableRef.current >= 6) {
                setLive("signal");
                setLiveResult(result);
              }
            } else {
              stableRef.current = Math.max(stableRef.current - 1, 0);
              if (stableRef.current === 0) {
                setLive("no-signal");
                setLiveResult(null);
              }
            }
          }
          frameRef.current = window.requestAnimationFrame(scan);
        };
        frameRef.current = window.requestAnimationFrame(scan);
      } catch {
        setCamError("Camera permission blocked. Allow camera access and try again.");
      }
    }

    void startCamera();
    return () => { isMounted = false; stopCamera(); };
  }, []);

  const colorLabel = liveResult?.color === "red"
    ? "🔴 Red laser ~650nm"
    : liveResult?.color === "purple"
    ? "🟣 IR ~850–1550nm"
    : "⚪ White laser";

  function saveResult(present: boolean) {
    onDetected(present
      ? (liveResult ?? { color: "red", score: 80 })
      : { color: "white", score: 0 }
    );
  }

  return (
    <div className="scanner-overlay" role="dialog" aria-modal="true" aria-label="Validate fiber laser signal">
      <section className="scanner-panel fiber-signal-panel">
        <header>
          <div>
            <p>Fiber Validation</p>
            <h2>Signal Monitor</h2>
            <span>Touch the fiber tip to the camera lens. The indicator updates live — camera stays open until you close.</span>
          </div>
          <button onClick={onClose} type="button">Close</button>
        </header>

        {/* ── Live signal indicator ── */}
        <div className={`fiber-live-indicator ${live}`}>
          {live === "waiting"   && <><span className="fiber-live-dot" />  <strong>Waiting for camera…</strong></>}
          {live === "no-signal" && <><span className="fiber-live-dot" />  <strong>No signal</strong><small>Touch fiber tip to lens</small></>}
          {live === "signal"    && <><span className="fiber-live-dot" />  <strong>Signal detected</strong><small>{colorLabel}{liveResult?.score ? ` — confidence ${liveResult.score}%` : ""}</small></>}
        </div>

        {/* ── Camera feed ── */}
        <div className="scanner-camera fiber-signal-camera">
          <video ref={videoRef} muted playsInline />
          <canvas ref={canvasRef} aria-hidden="true" />
          <div className="scanner-frame fiber-signal-frame">
            <span /><span /><span /><span />
          </div>
        </div>

        {camError && <p className="fiber-cam-error">{camError}</p>}

        {/* ── Save buttons ── */}
        {camReady && (
          <div className="fiber-signal-manual">
            <p>Log result for this fiber:</p>
            <div>
              <button className="fiber-btn-good" onClick={() => saveResult(true)}  type="button">Signal Present ✓</button>
              <button className="fiber-btn-bad"  onClick={() => saveResult(false)} type="button">No Signal ✗</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function QRStudio({
  initialAsset,
  registryAssets,
  onAssetsChanged,
  onOpenScanner
}: {
  initialAsset: AssetRecord | null;
  registryAssets: AssetRecord[];
  onAssetsChanged: () => Promise<void>;
  onOpenScanner: () => void;
}) {
  const [asset, setAsset] = useState<AssetRecord>(() => emptyAsset());
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [qrImage, setQrImage] = useState("");
  const [database, setDatabase] = useState<AssetDatabaseApi | null>(null);
  const [search, setSearch] = useState("");
  const [scanValue, setScanValue] = useState("");
  const [message, setMessage] = useState("Database ready");

  const qrPayload = useMemo(() => getQrPayload(asset), [asset]);
  const selectedAssetKind = asset.assetType === "Rack" ? "Rack" : asset.assetType.includes("Cable") ? "Cable" : "Server";
  const printTitle = asset.name.trim() || `${selectedAssetKind} ${asset.id}`;
  const indexedAssets = useMemo(() => {
    const byId = new Map<string, AssetRecord>();
    registryAssets.forEach((item) => byId.set(item.id, item));
    assets.forEach((item) => byId.set(item.id, item));
    return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [assets, registryAssets]);

  const matchingAssets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return indexedAssets.slice(0, 8);

    return indexedAssets.filter((item) =>
      [item.id, item.qrCode, item.assetType, item.name, item.ipAddress, item.rack, item.room, item.site, item.serial, item.macAddress, item.switchPort, item.from, item.to, item.owner, item.tags]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [indexedAssets, search]);

  useEffect(() => {
    getAssetDatabase()
      .then(async (api) => {
        setDatabase(api);
        const rows = await api.getAll();
        setAssets(rows);
        setMessage(`Database ready: ${rows.length} assets indexed`);
      })
      .catch(() => setMessage("Database unavailable"));
  }, []);

  useEffect(() => {
    if (!initialAsset) return;
    setAsset(initialAsset);
    setSearch(initialAsset.id);
    setMessage(`Opened ${initialAsset.id}`);
  }, [initialAsset]);

  useEffect(() => {
    QRCode.toDataURL(qrPayload, { errorCorrectionLevel: "M", margin: 1, width: 320, color: { dark: "#07111c", light: "#ffffff" } })
      .then(setQrImage)
      .catch(() => setQrImage(""));
  }, [qrPayload]);

  function updateAsset<K extends keyof AssetRecord>(key: K, value: AssetRecord[K]) {
    setAsset((current) => ({
      ...current,
      [key]: value,
      updatedAt: new Date().toISOString()
    }));
  }

  function startNewAsset() {
    const id = createAssetId();
    setAsset(createAssetDraft(id));
    setSearch("");
    setScanValue("");
    setMessage(`New asset started with QR ${id}`);
  }

  function createQr() {
    const id = createAssetId();
    const now = new Date().toISOString();
    setAsset((current) => ({ ...current, id, qrCode: id, createdAt: now, updatedAt: now }));
    setMessage(`QR regenerated as ${id}`);
  }

  function selectAssetKind(kind: "Server" | "Rack" | "Cable") {
    setAsset((current) => ({
      ...current,
      assetType: kind === "Cable" ? "Fiber Cable" : kind,
      updatedAt: new Date().toISOString()
    }));
  }

  async function saveAsset(target = asset) {
    if (!database) {
      setMessage("Database is still opening");
      return;
    }

    const savedAsset = {
      ...target,
      qrCode: target.id,
      name: target.name.trim() || `${target.assetType} ${target.id}`,
      updatedAt: new Date().toISOString()
    };

    await database.put(savedAsset);
    const rows = await database.getAll();
    setAsset(savedAsset);
    setAssets(rows);
    setSearch(savedAsset.id);
    await onAssetsChanged();
    setMessage(`Saved ${savedAsset.id} to the asset registry`);
  }

  async function duplicateAsset() {
    const id = createAssetId();
    const now = new Date().toISOString();
    const copy = {
      ...asset,
      id,
      qrCode: id,
      name: asset.name ? `${asset.name} Copy` : "",
      serial: "",
      createdAt: now,
      updatedAt: now
    };

    setAsset(copy);
    await saveAsset(copy);
    setMessage(`Duplicated as ${id}`);
  }

  async function openFromScan() {
    if (!database) return;
    const id = normalizeAssetLookup(scanValue);
    const found = await database.getById(id);
    const fallbackAsset = indexedAssets.find((item) => item.id === id || item.qrCode === id);
    const resolvedAsset = found ?? fallbackAsset;

    if (!resolvedAsset) {
      const shouldCreate = window.confirm(`QR/RFID code ${id} was not found in the database.\n\nAdd it as a new asset?`);

      if (shouldCreate) {
        const draft = createAssetDraft(id, scanValue.trim());
        setAsset(draft);
        setSearch("");
        setScanValue("");
        setMessage(`QR/RFID ${id} was not found. Fill the details, then Save to DB.`);
        return;
      }

      setMessage(`QR/RFID ${id} was not found and was not added.`);
      return;
    }

    setAsset(resolvedAsset);
    setSearch(resolvedAsset.id);
    setMessage(`Opened ${resolvedAsset.id}`);
  }

  function printLabel() {
    if (!qrImage) {
      setMessage("QR is still generating");
      return;
    }

    const frame = document.createElement("iframe");
    frame.title = `Print QR ${asset.id}`;
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const printDocument = frame.contentWindow?.document;
    if (!printDocument) {
      frame.remove();
      setMessage("Print preview could not open");
      return;
    }

    const printPageTitle = asset.id.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character] ?? character);

    printDocument.open();
    printDocument.write(`
      <!doctype html>
      <html>
        <head>
          <title>${printPageTitle} QR</title>
          <style>
            @page { size: 50mm 50mm; margin: 0; }
            * { box-sizing: border-box; }
            html,
            body {
              width: 50mm;
              height: 50mm;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            body {
              display: grid;
              place-items: center;
            }
            img {
              width: 42mm;
              height: 42mm;
              display: block;
              image-rendering: pixelated;
            }
          </style>
        </head>
        <body>
          <img alt="PatchPilot QR code" src="${qrImage}" />
        </body>
      </html>
    `);
    printDocument.close();

    const qr = printDocument.querySelector("img");
    const printQr = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 1000);
    };

    if (qr?.complete) {
      window.setTimeout(printQr, 50);
    } else {
      qr?.addEventListener("load", () => window.setTimeout(printQr, 50), { once: true });
    }

    setMessage(`QR print prepared for ${asset.id}`);
  }

  function downloadQr() {
    if (!qrImage) return;
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = `${asset.id}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setMessage(`Downloaded ${asset.id}-qr.png`);
  }

  return (
    <section className="qr-studio">
      <section className="ops-card qr-create-stage">
        <div className="qr-create-body">
          <div className="qr-code-box qr-code-primary">
            {qrImage ? <img alt="Asset QR code" src={qrImage} /> : <span>Generating QR</span>}
          </div>

          <div className="print-label qr-print-label">
            <div>
              <strong>{printTitle}</strong>
              <span>{selectedAssetKind} / {asset.id}</span>
            </div>
            {qrImage && <img alt="Printable asset QR code" src={qrImage} />}
            <small>{asset.site || "Site"} {asset.room && `/ ${asset.room}`} {asset.rack && `/ ${asset.rack}`} {asset.ruPosition && `/ RU ${asset.ruPosition}`}</small>
            <em>{qrPayload}</em>
          </div>

          <div className="qr-create-controls">
            <p className="qr-create-meta">{message}</p>
            <div className="asset-kind-picker" aria-label="Asset type">
              {(["Server", "Rack", "Cable"] as const).map((kind) => (
                <button className={selectedAssetKind === kind ? "active" : ""} key={kind} onClick={() => selectAssetKind(kind)} type="button">
                  {kind}
                </button>
              ))}
            </div>

            <div className="qr-primary-actions">
              <button onClick={() => void saveAsset()} type="button">Save to DB</button>
              <button onClick={printLabel} type="button">Print QR</button>
              <button onClick={onOpenScanner} type="button">Scan</button>
            </div>
          </div>
        </div>
      </section>

      <div className="qr-layout">
        <section className="ops-card qr-editor-card">
          <header>
            <div>
              <h2>{selectedAssetKind} Details</h2>
              <span>Fill only the fields needed for this QR asset type, then save to DB.</span>
            </div>
          </header>

          <div className="form-section">
            <h3>Identity</h3>
            <div className="field-grid">
              <Field label={`${selectedAssetKind} Name`} value={asset.name} onChange={(value) => updateAsset("name", value)} />
              <Field label="QR ID" value={asset.id} readOnly />
              <SelectField label="Status" value={asset.status} options={assetStatuses} onChange={(value) => updateAsset("status", value as AssetStatus)} />
            </div>
          </div>

          {selectedAssetKind === "Server" && (
            <>
              <div className="form-section">
                <h3>Server</h3>
                <div className="field-grid">
                  <Field label="Serial Number" value={asset.serial} onChange={(value) => updateAsset("serial", value)} />
                  <Field label="Site" value={asset.site} onChange={(value) => updateAsset("site", value)} />
                  <Field label="Room" value={asset.room} onChange={(value) => updateAsset("room", value)} />
                  <Field label="Rack" value={asset.rack} onChange={(value) => updateAsset("rack", value)} />
                  <Field label="RU Position" value={asset.ruPosition} onChange={(value) => updateAsset("ruPosition", value)} />
                  <Field label="Owner" value={asset.owner} onChange={(value) => updateAsset("owner", value)} />
                </div>
              </div>

              <div className="form-section">
                <h3>Network</h3>
                <div className="field-grid">
                  <Field label="IP Address" value={asset.ipAddress} onChange={(value) => updateAsset("ipAddress", value)} />
                  <Field label="MAC Address" value={asset.macAddress} onChange={(value) => updateAsset("macAddress", value)} />
                  <Field label="VLAN" value={asset.vlan} onChange={(value) => updateAsset("vlan", value)} />
                  <Field label="Switch Port" value={asset.switchPort} onChange={(value) => updateAsset("switchPort", value)} />
                </div>
              </div>
            </>
          )}

          {selectedAssetKind === "Rack" && (
            <div className="form-section">
              <h3>Rack</h3>
              <div className="field-grid">
                <Field label="Site" value={asset.site} onChange={(value) => updateAsset("site", value)} />
                <Field label="Room" value={asset.room} onChange={(value) => updateAsset("room", value)} />
                <Field label="Rack / Row" value={asset.rack} onChange={(value) => updateAsset("rack", value)} />
                <Field label="Owner" value={asset.owner} onChange={(value) => updateAsset("owner", value)} />
                <Field label="Tags" value={asset.tags} onChange={(value) => updateAsset("tags", value)} />
              </div>
            </div>
          )}

          {selectedAssetKind === "Cable" && (
            <div className="form-section">
              <h3>Cable</h3>
              <div className="field-grid">
                <Field label="Cable Type" value={asset.cableType} onChange={(value) => updateAsset("cableType", value)} />
                <Field label="Length" value={asset.length} onChange={(value) => updateAsset("length", value)} />
                <Field label="Connector Type" value={asset.connectorType} onChange={(value) => updateAsset("connectorType", value)} />
                <Field label="From" value={asset.from} onChange={(value) => updateAsset("from", value)} />
                <Field label="To" value={asset.to} onChange={(value) => updateAsset("to", value)} />
                <Field label="Rack / Path" value={asset.rack} onChange={(value) => updateAsset("rack", value)} />
                <Field label="Owner" value={asset.owner} onChange={(value) => updateAsset("owner", value)} />
              </div>
            </div>
          )}

          <div className="form-section">
            <h3>Notes</h3>
            <div className="field-grid">
              <Field label="Last Updated" value={new Date(asset.updatedAt).toLocaleString()} readOnly />
              <label className="field wide-field">
                <span>Notes</span>
                <textarea value={asset.notes} onChange={(event) => updateAsset("notes", event.target.value)} />
              </label>
            </div>
          </div>
        </section>

        <aside className="qr-side">
          <section className="ops-card asset-search-card">
            <header>
              <div>
                <h2>Scan or Retrieve from DB</h2>
                <span>Search by QR, serial, hostname, rack, IP, MAC, owner or tag.</span>
              </div>
              <button onClick={() => setSearch("")} type="button">Clear</button>
            </header>
            <div className="asset-search-tools">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="QR ID, name, IP, rack, serial, MAC..." />
              <div className="scan-open-row">
                <input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="patchpilot://asset/PP-000128" />
                <button onClick={() => void openFromScan()} type="button">Retrieve</button>
              </div>
            </div>
            <div className="asset-result-list">
              {matchingAssets.map((item) => (
                <button key={item.id} onClick={() => setAsset(item)} type="button">
                  <strong>{item.name || item.id}</strong>
                  <span>{item.assetType} / {item.rack || "No rack"} / {item.ipAddress || item.serial || "No identifier"}</span>
                  <em>{item.id}</em>
                </button>
              ))}
            </div>
          </section>

          <section className="ops-card qr-schema-card">
            <header>
              <h2>QR Payload</h2>
              <button onClick={downloadQr} type="button">Download</button>
            </header>
            <pre>{qrPayload}</pre>
          </section>
        </aside>
      </div>
    </section>
  );
}

// ── Ticket badges ─────────────────────────────────────────────────────────────

function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  return <em className={`ticket-priority priority-${priority.toLowerCase()}`}>{priority}</em>;
}

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <em className={`ticket-status status-${status.toLowerCase().replace(" ", "-")}`}>{status}</em>;
}

// ── TicketsPage ───────────────────────────────────────────────────────────────

function TicketsPage() {
  const [selectedTicketId, setSelectedTicketId] = useState(demoTickets[0].id);
  const [ticketQuery, setTicketQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [sourceFilter, setSourceFilter] = useState("All Sources");

  const filteredTickets = useMemo(() => {
    const needle = ticketQuery.trim().toLowerCase();
    return demoTickets.filter((ticket) => {
      const matchesQuery = !needle || [ticket.id, ticket.title, ticket.assetId, ticket.assetName, ticket.assignee].join(" ").toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "All Status" || ticket.status === statusFilter;
      const matchesPriority = priorityFilter === "All Priority" || ticket.priority === priorityFilter;
      const matchesSource = sourceFilter === "All Sources" || ticket.source === sourceFilter;
      return matchesQuery && matchesStatus && matchesPriority && matchesSource;
    });
  }, [ticketQuery, statusFilter, priorityFilter, sourceFilter]);

  const selectedTicket = filteredTickets.find((ticket) => ticket.id === selectedTicketId) ?? filteredTickets[0] ?? demoTickets[0];

  const ticketStats = useMemo(() => ({
    critical: demoTickets.filter((ticket) => ticket.priority === "Critical").length,
    open: demoTickets.filter((ticket) => ticket.status === "Open").length,
    inProgress: demoTickets.filter((ticket) => ticket.status === "In Progress").length,
    resolved: demoTickets.filter((ticket) => ticket.status === "Resolved" || ticket.status === "Closed").length
  }), []);

  return (
    <section className="system-page tickets-page">
      <header className="system-hero">
        <div>
          <p>Field Operations</p>
          <h1>Tickets</h1>
          <span>Work orders and incident tracking for assets, racks, cables, and QR-linked field events.</span>
        </div>
        <div className="system-hero-actions">
          <button type="button">New Ticket</button>
          <button type="button">Connect Jira</button>
        </div>
      </header>

      <section className="system-kpis">
        <article className={ticketStats.critical ? "warning" : ""}>
          <span>Critical</span>
          <strong>{ticketStats.critical}</strong>
          <small>Immediate action required</small>
        </article>
        <article>
          <span>Open</span>
          <strong>{ticketStats.open}</strong>
          <small>Awaiting assignment</small>
        </article>
        <article>
          <span>In Progress</span>
          <strong>{ticketStats.inProgress}</strong>
          <small>Actively worked</small>
        </article>
        <article>
          <span>Resolved</span>
          <strong>{ticketStats.resolved}</strong>
          <small>Closed this session</small>
        </article>
      </section>

      <section className="rack-toolbar system-toolbar tickets-toolbar ops-card">
        <input value={ticketQuery} onChange={(event) => setTicketQuery(event.target.value)} placeholder="Search tickets, assets, assignee..." />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option>All Status</option>
          <option>Open</option>
          <option>In Progress</option>
          <option>Pending</option>
          <option>Resolved</option>
          <option>Closed</option>
        </select>
        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
          <option>All Priority</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
          <option>All Sources</option>
          <option>QR Scan</option>
          <option>Manual</option>
          <option>Alert</option>
          <option>Import</option>
        </select>
      </section>

      <div className="tickets-workspace">
        <section className="ops-card tickets-list-card">
          <header>
            <h2>Work Queue</h2>
            <button type="button">{filteredTickets.length} tickets</button>
          </header>
          <div className="tickets-head">
            <span>Ticket</span>
            <span>Asset</span>
            <span>Assignee</span>
            <span>Priority</span>
            <span>Status</span>
          </div>
          <div className="tickets-table">
            {filteredTickets.map((ticket) => (
              <button className={selectedTicket.id === ticket.id ? "active" : ""} key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} type="button">
                <span>
                  <b>{ticket.title}</b>
                  <small>{ticket.id} / {ticket.source}</small>
                </span>
                <span>
                  <b>{ticket.assetName || ticket.assetId || "No asset"}</b>
                  <small>{ticket.assetId}</small>
                </span>
                <span>{ticket.assignee}</span>
                <TicketPriorityBadge priority={ticket.priority} />
                <TicketStatusBadge status={ticket.status} />
              </button>
            ))}
          </div>
        </section>

        <aside className="ops-card ticket-detail-panel">
          <header>
            <div>
              <h2>{selectedTicket.title}</h2>
              <span>{selectedTicket.id} / {selectedTicket.source}</span>
            </div>
            <TicketPriorityBadge priority={selectedTicket.priority} />
          </header>

          <div className="ticket-identity">
            <TicketStatusBadge status={selectedTicket.status} />
            <span>{selectedTicket.provider}</span>
          </div>

          <div className="ticket-detail-grid">
            <span><small>Asset</small><b>{selectedTicket.assetName || "No asset"}</b></span>
            <span><small>Asset ID</small><b>{selectedTicket.assetId || "—"}</b></span>
            <span><small>Assignee</small><b>{selectedTicket.assignee}</b></span>
            <span><small>Source</small><b>{selectedTicket.source}</b></span>
            <span><small>Created</small><b>{selectedTicket.createdAt}</b></span>
            <span><small>Updated</small><b>{selectedTicket.updatedAt}</b></span>
          </div>

          <section className="ticket-description">
            <strong>Description</strong>
            <p>{selectedTicket.description}</p>
          </section>

          <div className="service-provider-strip">
            {serviceDeskProviders.map((provider) => (
              <button key={provider.name} type="button">
                <span>{provider.icon}</span>
                <strong>{provider.name}</strong>
                <em>{provider.status === "Ready" ? "Connect" : "Planned"}</em>
              </button>
            ))}
          </div>

          <div className="ticket-actions">
            <button type="button">Assign to Me</button>
            <button type="button">Open in Jira</button>
            <button type="button">Mark Resolved</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ── TechniciansPage ───────────────────────────────────────────────────────────

function TechniciansPage() {
  const [selectedTechId, setSelectedTechId] = useState(technicianDetails[0].id);

  const selectedTech = technicianDetails.find((tech) => tech.id === selectedTechId) ?? technicianDetails[0];

  const stats = useMemo(() => ({
    online: technicianDetails.filter((tech) => tech.status === "Online").length,
    offline: technicianDetails.filter((tech) => tech.status === "Offline").length,
    pending: technicianDetails.filter((tech) => tech.status === "Pending").length,
    totalScans: technicianDetails.reduce((sum, tech) => sum + tech.scansToday, 0)
  }), []);

  return (
    <section className="system-page technicians-page">
      <header className="system-hero">
        <div>
          <p>Field Team</p>
          <h1>Technicians</h1>
          <span>Live field technician status, task assignment, and activity tracking across all sites.</span>
        </div>
        <div className="system-hero-actions">
          <button type="button">Add Technician</button>
          <button type="button">Assign Task</button>
        </div>
      </header>

      <section className="system-kpis">
        <article>
          <span>Online</span>
          <strong>{stats.online}</strong>
          <small>Active on site now</small>
        </article>
        <article className={stats.offline ? "warning" : ""}>
          <span>Offline</span>
          <strong>{stats.offline}</strong>
          <small>Not syncing</small>
        </article>
        <article>
          <span>Pending Sync</span>
          <strong>{stats.pending}</strong>
          <small>Awaiting connection</small>
        </article>
        <article>
          <span>Scans Today</span>
          <strong>{stats.totalScans}</strong>
          <small>Across all technicians</small>
        </article>
      </section>

      <div className="technicians-workspace">
        <div className="tech-grid">
          {technicianDetails.map((tech) => (
            <button className={`tech-card ${selectedTechId === tech.id ? "selected" : ""}`} key={tech.id} onClick={() => setSelectedTechId(tech.id)} type="button">
              <div className="tech-card-head">
                <span className="avatar tech-avatar">{tech.initials}</span>
                <div>
                  <strong>{tech.name}</strong>
                  <small>{tech.task}</small>
                </div>
                <StatusPill status={tech.status} label={tech.status} />
              </div>
              <div className="tech-card-meta">
                <span><b>{tech.scansToday}</b><small>Scans</small></span>
                <span><b>{tech.ticketsOpen}</b><small>Tickets</small></span>
                <span><b>{tech.site}</b><small>Site</small></span>
              </div>
              <small className="tech-last-seen">Last seen: {tech.lastSeen}</small>
            </button>
          ))}
        </div>

        <aside className="ops-card tech-detail-panel">
          <header>
            <div className="tech-detail-header">
              <span className="avatar tech-avatar-lg">{selectedTech.initials}</span>
              <div>
                <h2>{selectedTech.name}</h2>
                <span>{selectedTech.task} / {selectedTech.site}</span>
              </div>
            </div>
            <StatusPill status={selectedTech.status} label={selectedTech.status} />
          </header>

          <div className="tech-detail-grid">
            <span><small>Email</small><b>{selectedTech.email}</b></span>
            <span><small>Phone</small><b>{selectedTech.phone}</b></span>
            <span><small>Site</small><b>{selectedTech.site}</b></span>
            <span><small>Last Seen</small><b>{selectedTech.lastSeen}</b></span>
            <span><small>Scans Today</small><b>{selectedTech.scansToday}</b></span>
            <span><small>Open Tickets</small><b>{selectedTech.ticketsOpen}</b></span>
          </div>

          <section className="tech-activity">
            <header>
              <strong>Recent Activity</strong>
            </header>
            {selectedTech.recentActivity.map((item, index) => (
              <article className="tech-activity-row" key={`${selectedTech.id}-${index}`}>
                <span className={`tone-${item.tone}`}>●</span>
                <div>
                  <strong>{item.action}</strong>
                  <small>{item.time}</small>
                </div>
              </article>
            ))}
          </section>

          <div className="tech-actions">
            <button type="button">Assign Task</button>
            <button type="button">Send Message</button>
            <button type="button">View Full Log</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ── MapPage ───────────────────────────────────────────────────────────────────

function MapPage({ onNavigateToRacks }: { onNavigateToRacks: () => void }) {
  const [selectedSite, setSelectedSite] = useState("DC1");
  const [hoveredRack, setHoveredRack] = useState<RackRecord | null>(null);

  const sites = useMemo(() => {
    const siteMap: Record<string, Record<string, RackRecord[]>> = {};
    for (const rack of rackFleet) {
      if (!siteMap[rack.site]) siteMap[rack.site] = {};
      if (!siteMap[rack.site][rack.room]) siteMap[rack.site][rack.room] = [];
      siteMap[rack.site][rack.room].push(rack);
    }
    return siteMap;
  }, []);

  const siteStats = useMemo(() => {
    const racks = rackFleet.filter((rack) => rack.site === selectedSite);
    return {
      total: racks.length,
      critical: racks.filter((rack) => rack.health === "Critical").length,
      warning: racks.filter((rack) => rack.health === "Warning").length,
      devices: racks.reduce((sum, rack) => sum + rack.devices.length, 0),
      power: racks.reduce((sum, rack) => sum + rack.powerKw, 0)
    };
  }, [selectedSite]);

  const selectedSiteRooms = sites[selectedSite] ?? {};

  return (
    <section className="system-page map-page">
      <header className="system-hero">
        <div>
          <p>Infrastructure</p>
          <h1>Site Map</h1>
          <span>Visual layout of datacenter sites, rooms, rows, and rack positions with live health overlay.</span>
        </div>
        <div className="system-hero-actions">
          <button type="button">Export Layout</button>
          <button type="button">Add Site</button>
        </div>
      </header>

      <section className="system-kpis">
        <article>
          <span>Racks on Site</span>
          <strong>{siteStats.total}</strong>
          <small>{Object.keys(selectedSiteRooms).length} rooms</small>
        </article>
        <article className={siteStats.critical ? "warning" : ""}>
          <span>Exceptions</span>
          <strong>{siteStats.critical + siteStats.warning}</strong>
          <small>{siteStats.critical} critical / {siteStats.warning} warning</small>
        </article>
        <article>
          <span>Devices</span>
          <strong>{siteStats.devices}</strong>
          <small>QR-linked on this site</small>
        </article>
        <article>
          <span>Power Load</span>
          <strong>{siteStats.power.toFixed(1)} kW</strong>
          <small>Total draw on site</small>
        </article>
      </section>

      <div className="map-site-tabs">
        {Object.keys(sites).map((site) => (
          <button className={selectedSite === site ? "active" : ""} key={site} onClick={() => setSelectedSite(site)} type="button">{site}</button>
        ))}
      </div>

      <div className="map-workspace">
        <section className="ops-card map-floor-card">
          <header>
            <div>
              <h2>{selectedSite} Floor Plan</h2>
              <span>Click any rack to open its workspace in the Racks view</span>
            </div>
            <div className="map-topology-legend">
              <span><i className="healthy" />Healthy</span>
              <span><i className="warning" />Warning</span>
              <span><i className="critical" />Critical</span>
            </div>
          </header>
          <div className="map-rooms">
            {Object.entries(selectedSiteRooms).map(([room, racks]) => (
              <div className="map-room" key={room}>
                <div className="map-room-label">
                  <strong>{room}</strong>
                  <span>{racks.length} racks</span>
                </div>
                <div className="map-rack-grid">
                  {racks.map((rack) => (
                    <button
                      className={`map-rack ${rack.health.toLowerCase()}`}
                      key={rack.id}
                      onClick={onNavigateToRacks}
                      onMouseEnter={() => setHoveredRack(rack)}
                      onMouseLeave={() => setHoveredRack(null)}
                      title={`${rack.name} / ${rack.health} / ${rack.powerKw.toFixed(1)} kW`}
                      type="button"
                    >
                      <span>{rack.name.replace("RACK-", "")}</span>
                      <small>{Math.round((rack.powerKw / rack.powerCapacityKw) * 100)}%</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="ops-card map-detail-panel">
          <header>
            <h2>{hoveredRack ? hoveredRack.name : "Hover a rack"}</h2>
          </header>
          {hoveredRack ? (
            <>
              <div className="map-rack-detail">
                <span><small>Site</small><b>{hoveredRack.site}</b></span>
                <span><small>Room</small><b>{hoveredRack.room}</b></span>
                <span><small>Row</small><b>{hoveredRack.row}</b></span>
                <span><small>Health</small><b><HealthBadge health={hoveredRack.health} /></b></span>
                <span><small>Temperature</small><b>{hoveredRack.temperature}°C</b></span>
                <span><small>Power</small><b>{hoveredRack.powerKw.toFixed(1)} / {hoveredRack.powerCapacityKw} kW</b></span>
                <span><small>Devices</small><b>{hoveredRack.devices.length}</b></span>
                <span><small>Cables</small><b>{hoveredRack.cableCount}</b></span>
              </div>
              <div className="map-device-list">
                {hoveredRack.devices.map((device) => (
                  <article key={device.id}>
                    <span className={`device-led ${device.status.toLowerCase()}`} />
                    <div>
                      <strong>{device.hostname}</strong>
                      <small>{device.kind} / U{device.startU}</small>
                    </div>
                    <em>{device.ip}</em>
                  </article>
                ))}
              </div>
              <button className="map-open-btn" onClick={onNavigateToRacks} type="button">Open in Racks View</button>
            </>
          ) : (
            <div className="map-empty-detail">
              <span>Hover over any rack on the floor plan to see live details and navigate to the rack workspace.</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

// ── ReportsPage ───────────────────────────────────────────────────────────────

function ReportsPage() {
  const assetsByCategory = useMemo(() =>
    assetCategories.map((category) => ({
      category,
      count: demoAssetInventory.filter((asset) => getAssetCategory(asset) === category).length,
      active: demoAssetInventory.filter((asset) => getAssetCategory(asset) === category && (asset.status === "Active" || asset.status === "In Service")).length
    })),
  []);

  const rackHealthSummary = useMemo(() => ({
    healthy: rackFleet.filter((rack) => rack.health === "Healthy").length,
    warning: rackFleet.filter((rack) => rack.health === "Warning").length,
    critical: rackFleet.filter((rack) => rack.health === "Critical").length,
    total: rackFleet.length
  }), []);

  const cableStockSummary = useMemo(() => ({
    inStock: cableInventory.filter((item) => item.status === "In Stock").reduce((sum, item) => sum + item.quantity, 0),
    lowStock: cableInventory.filter((item) => item.status === "Low Stock").length,
    total: cableInventory.reduce((sum, item) => sum + item.quantity, 0)
  }), []);

  const auditSummary = useMemo(() => ({
    total: auditLogEntries.length,
    info: auditLogEntries.filter((entry) => entry.severity === "Info").length,
    warning: auditLogEntries.filter((entry) => entry.severity === "Warning").length,
    critical: auditLogEntries.filter((entry) => entry.severity === "Critical").length,
    sources: new Set(auditLogEntries.map((entry) => entry.source)).size
  }), []);

  const maxAssets = Math.max(...assetsByCategory.map((group) => group.count), 1);

  return (
    <section className="system-page reports-page">
      <header className="system-hero">
        <div>
          <p>Operations Intelligence</p>
          <h1>Reports</h1>
          <span>Aggregated asset, rack, cable, and audit data for operations review and export.</span>
        </div>
        <div className="system-hero-actions">
          <button type="button">Export CSV</button>
          <button type="button">Schedule Report</button>
        </div>
      </header>

      <section className="system-kpis">
        <article>
          <span>Total Assets</span>
          <strong>{demoAssetInventory.length}</strong>
          <small>Across {new Set(demoAssetInventory.map((asset) => asset.site)).size} sites</small>
        </article>
        <article>
          <span>Racks Monitored</span>
          <strong>{rackFleet.length}</strong>
          <small>{rackHealthSummary.critical} critical / {rackHealthSummary.warning} warning</small>
        </article>
        <article>
          <span>Cable SKUs</span>
          <strong>{cableInventory.length}</strong>
          <small>{cableStockSummary.total.toLocaleString()} total units</small>
        </article>
        <article className={auditSummary.warning + auditSummary.critical > 0 ? "warning" : ""}>
          <span>Audit Events</span>
          <strong>{auditSummary.total}</strong>
          <small>{auditSummary.warning} warnings / {auditSummary.critical} critical</small>
        </article>
      </section>

      <div className="reports-grid">
        <section className="ops-card report-card">
          <header>
            <h2>Asset Breakdown by Category</h2>
            <button type="button">Export</button>
          </header>
          <div className="report-bar-chart">
            {assetsByCategory.map((group) => (
              <article key={group.category}>
                <div>
                  <div className="bar-label">
                    <strong>{group.category}</strong>
                    <span>{group.count} total / {group.active} active</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(group.count / maxAssets) * 100}%` }} />
                    <div className="bar-fill-active" style={{ width: `${(group.active / maxAssets) * 100}%` }} />
                  </div>
                </div>
                <b>{group.count}</b>
              </article>
            ))}
          </div>
        </section>

        <section className="ops-card report-card">
          <header>
            <h2>Rack Health Distribution</h2>
            <button type="button">Export</button>
          </header>
          <div className="report-donut-area">
            <div className="report-health-bars">
              {([
                { label: "Healthy", count: rackHealthSummary.healthy, tone: "green" },
                { label: "Warning", count: rackHealthSummary.warning, tone: "amber" },
                { label: "Critical", count: rackHealthSummary.critical, tone: "red" }
              ] as const).map((row) => (
                <article key={row.label}>
                  <div>
                    <div className="bar-label">
                      <strong className={`tone-${row.tone}`}>{row.label}</strong>
                      <span>{row.count} racks</span>
                    </div>
                    <div className="bar-track">
                      <div className={`bar-fill tone-bg-${row.tone}`} style={{ width: `${(row.count / rackHealthSummary.total) * 100}%` }} />
                    </div>
                  </div>
                  <b>{Math.round((row.count / rackHealthSummary.total) * 100)}%</b>
                </article>
              ))}
            </div>
            <div className="report-totals">
              <strong>{rackHealthSummary.total}</strong>
              <span>Total racks monitored</span>
            </div>
          </div>
        </section>

        <section className="ops-card report-card">
          <header>
            <h2>Cable &amp; GBIC Stock Status</h2>
            <button type="button">Export</button>
          </header>
          <div className="report-stock-grid">
            {cableInventory.map((item) => (
              <article className={item.status === "Low Stock" ? "stock-alert" : item.status === "Quarantine" ? "stock-quarantine" : ""} key={item.id}>
                <div>
                  <strong>{item.sku}</strong>
                  <small>{item.vendor} / {item.connector}</small>
                </div>
                <div className="stock-qty">
                  <b className={item.quantity < item.minimum ? "tone-red" : "tone-green"}>{item.quantity}</b>
                  <small>min {item.minimum}</small>
                </div>
                <InventoryStatusBadge status={item.status} />
              </article>
            ))}
          </div>
        </section>

        <section className="ops-card report-card">
          <header>
            <h2>Audit Log Summary</h2>
            <button type="button">Export</button>
          </header>
          <div className="report-audit-summary">
            <div className="report-audit-kpis">
              <article><strong>{auditSummary.info}</strong><span>Info</span></article>
              <article><strong className="tone-amber">{auditSummary.warning}</strong><span>Warnings</span></article>
              <article><strong className="tone-red">{auditSummary.critical}</strong><span>Critical</span></article>
              <article><strong>{auditSummary.sources}</strong><span>Sources</span></article>
            </div>
            <div className="audit-trail-preview">
              {auditLogEntries.slice(0, 5).map((entry) => (
                <article key={entry.id}>
                  <AuditSeverityBadge severity={entry.severity} />
                  <div>
                    <strong>{entry.action}</strong>
                    <small>{entry.actor} / {entry.source} / {entry.time}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, readOnly = false }: { label: string; value: string; onChange?: (value: string) => void; readOnly?: boolean }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input readOnly={readOnly} value={value} onChange={(event) => onChange?.(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Card({ title, action, className = "", children }: { title: string; action?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`ops-card ${className}`}>
      <header>
        <h2>{title}</h2>
        {action && <button type="button">{action}</button>}
      </header>
      {children}
    </section>
  );
}

function RackMiniCard({ rack }: { rack: Rack }) {
  const usage = Math.round((rack.used / rack.total) * 100);
  const tone = usage > 90 ? "red" : usage > 75 ? "green" : "amber";

  return (
    <article className="rack-mini">
      <div className="rack-mini-head">
        <strong>{rack.name}</strong>
        <span className={`tone-${tone}`}>{usage}%</span>
      </div>
      <div className="rack-mini-body">
        <div className="rack-tower">
          {Array.from({ length: 18 }).map((_, index) => (
            <span className={index >= 18 - Math.round((usage / 100) * 18) ? tone : ""} key={`${rack.name}-${index}`} />
          ))}
        </div>
        <div className="rack-stats">
          <p><strong>{rack.used}</strong> / {rack.total} RU</p>
          <span>Used</span>
          <p>Power <b className={`tone-${tone}`}>{rack.power}%</b></p>
          <div className="power-line"><span style={{ width: `${rack.power}%` }} /></div>
          <p>Cooling <b className={rack.cooling === "Warning" ? "tone-amber" : "tone-green"}>{rack.cooling === "Warning" ? "Warning" : "OK"}</b></p>
        </div>
      </div>
      <small>{rack.row}</small>
    </article>
  );
}

function ActivityRow({ item }: { item: Activity }) {
  return (
    <article className="activity-row">
      <span className={`tone-${item.tone}`}>{item.icon}</span>
      <strong>{item.title}</strong>
      <small>{item.time}</small>
    </article>
  );
}

function TechnicianRow({ technician }: { technician: Technician }) {
  return (
    <article className="technician-row">
      <span className="avatar">{technician.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
      <div>
        <strong>{technician.name}</strong>
        <small>{technician.task}</small>
      </div>
      <StatusPill status={technician.status} label={technician.status === "Online" ? "On Site" : technician.status === "Pending" ? "Sync Pending" : "Offline"} />
    </article>
  );
}

function InfoRow({ title, detail, time, tone }: { title: string; detail: string; time: string; tone: Tone }) {
  return (
    <article className="info-row">
      <span className={`tone-${tone}`}>{title.slice(0, 2).toUpperCase()}</span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <em>{time}</em>
    </article>
  );
}

function StatusPill({ status, label }: { status: Health; label: string }) {
  return <span className={`status-pill ${status.toLowerCase()}`}>{label}</span>;
}
