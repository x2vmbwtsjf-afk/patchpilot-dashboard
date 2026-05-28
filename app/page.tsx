"use client";

import jsQR from "jsqr";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Severity = "Critical" | "High" | "Medium" | "Low";
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

type WorkOrder = {
  priority: Severity;
  title: string;
  detail: string;
  location: string;
  assignee: string;
  due: string;
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

type AssetDatabaseApi = {
  getAll: () => Promise<AssetRecord[]>;
  put: (asset: AssetRecord) => Promise<void>;
  getById: (id: string) => Promise<AssetRecord | null>;
};

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
  { label: "Work Queue", icon: "W", count: 8 },
  { label: "Technicians", icon: "T" },
  { label: "Assets", icon: "A" },
  { label: "Racks", icon: "R" },
  { label: "QR Studio", icon: "Q" },
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
  { label: "Work Orders", value: "24", delta: "8 in progress", icon: "WO" },
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
  { title: "Technician David started work order #1254", time: "8 min ago", icon: "WO", tone: "blue" },
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

const workOrders: WorkOrder[] = [
  { priority: "High", title: "Rack Audit - DC-A12", detail: "Annual audit and verification", location: "DC-A12", assignee: "David M.", due: "Today" },
  { priority: "High", title: "Fiber Link Validation", detail: "Check link between leaf and spine", location: "DC-B07", assignee: "Alex R.", due: "Today" },
  { priority: "Medium", title: "QR Label Missing", detail: "3 assets missing QR labels", location: "DC-C03", assignee: "Sean P.", due: "Tomorrow" },
  { priority: "Medium", title: "Power Capacity Check", detail: "Verify power draw on rack", location: "DC-A01", assignee: "Mike T.", due: "Tomorrow" }
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
  { id: "rack-audit", title: "Start Rack Audit", detail: "Create new audit", icon: "RA", tone: "amber" },
  { id: "print-labels", title: "Print QR Labels", detail: "Batch print labels", icon: "PR", tone: "slate" },
  { id: "work-order", title: "Create Work Order", detail: "New work order", icon: "WO", tone: "green" },
  { id: "fiber-test", title: "Validate Fiber Link", detail: "Run signal test", icon: "FL", tone: "blue" },
  { id: "import-assets", title: "Import Assets", detail: "From Excel or CSV", icon: "IM", tone: "blue" }
];

const assetTypes = ["Device", "Rack", "Fiber Cable", "Copper Cable", "Patch Panel", "UPS", "PDU", "Switch", "Server", "Storage", "Other"];
const assetStatuses: AssetStatus[] = ["Active", "In Service", "In Stock", "Maintenance", "Offline", "Retired"];

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

const emptyAsset = (): AssetRecord => {
  const now = new Date().toISOString();
  const id = createAssetId();

  return {
    id,
    qrCode: id,
    assetType: "Device",
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
    notes: "",
    tags: "",
    owner: "Operations",
    createdAt: now,
    updatedAt: now
  };
};

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

function getBarcodeDetectorConstructor() {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
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
  const [workFilter, setWorkFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [savedAssets, setSavedAssets] = useState<AssetRecord[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState("Point the camera at a PatchPilot QR label.");
  const [actionNotice, setActionNotice] = useState("Quick actions are ready.");

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

  const filteredWorkOrders = useMemo(() => {
    if (workFilter === "All") return workOrders;
    return workOrders.filter((order) => order.priority === workFilter);
  }, [workFilter]);

  const visibleActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return liveActivity;
    return liveActivity.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
  }, [query]);

  const searchAssets = useMemo(() => savedAssets.filter((asset) => assetMatchesQuery(asset, query)).slice(0, 7), [savedAssets, query]);

  function openAssetFromSearch(asset: AssetRecord) {
    setSelectedAsset(asset);
    setActiveNav("QR Studio");
    setQuery(asset.id);
    setIsSearchOpen(false);
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

      if (!found) {
        setScanMessage(`No saved asset found for ${id}. Save the asset in QR Studio first.`);
        return;
      }

      setSelectedAsset(found);
      setActiveNav("QR Studio");
      setQuery(found.id);
      setIsSearchOpen(false);
      setIsScannerOpen(false);
      setScanMessage(`Opened ${found.id}`);
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
        setActionNotice("Scanner opened for QR asset lookup.");
        break;
      case "rack-audit":
        setActiveNav("Racks");
        setQuery("rack");
        setActionNotice("Rack audit workspace opened.");
        break;
      case "print-labels":
        setActiveNav("QR Studio");
        setSelectedAsset(null);
        setQuery("label");
        setActionNotice("QR Studio opened for label preview, download, and print.");
        break;
      case "work-order":
        setActiveNav("Work Queue");
        setWorkFilter("High");
        setQuery("");
        setActionNotice("Work queue filtered to high-priority orders.");
        break;
      case "fiber-test":
        setActiveNav("Command");
        setWorkFilter("All");
        setQuery("fiber");
        setActionNotice("Fiber validation context loaded in activity and work search.");
        break;
      case "import-assets":
        setActiveNav("QR Studio");
        setSelectedAsset(null);
        setQuery("import");
        setActionNotice("QR Studio opened for asset entry and CSV/Excel staging.");
        break;
    }
  }

  return (
    <main className="ops-shell">
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
            <button key={item} type="button">
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
              placeholder="Search assets, racks, cables, QR codes, work orders..."
            />
            <kbd>CMD K</kbd>
            {isSearchOpen && query.trim() && (
              <div className="global-search-menu">
                <div className="global-search-title">
                  <strong>Assets</strong>
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
            <button className="bell" type="button">5</button>
            <button className="help" type="button">?</button>
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

        {activeNav === "Racks" ? (
          <RacksPage onOpenScanner={() => setIsScannerOpen(true)} />
        ) : activeNav === "Cables" ? (
          <CablesInventoryPage />
        ) : activeNav === "QR Studio" ? (
          <QRStudio initialAsset={selectedAsset} onAssetsChanged={refreshSavedAssets} onOpenScanner={() => setIsScannerOpen(true)} />
        ) : (
          <>
            <section className="dashboard-grid command-dashboard-grid">
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

              <Card className="work-card-main" title="Work Queue (8)" action="View All">
                <div className="work-filters">
                  {["All", "High", "Medium", "Low"].map((filter) => (
                    <button className={workFilter === filter ? "active" : ""} key={filter} onClick={() => setWorkFilter(filter)} type="button">
                      {filter}
                      <span>{filter === "All" ? 8 : filter === "High" ? 3 : filter === "Medium" ? 3 : 2}</span>
                    </button>
                  ))}
                </div>
                <div className="work-table">
                  <div className="work-head">
                    <span>Priority</span>
                    <span>Title</span>
                    <span>Location</span>
                    <span>Assigned To</span>
                    <span>Due</span>
                  </div>
                  {filteredWorkOrders.map((order) => (
                    <div className="work-row" key={order.title}>
                      <PriorityPill priority={order.priority} />
                      <span>
                        <b>{order.title}</b>
                        <small>{order.detail}</small>
                      </span>
                      <span>{order.location}</span>
                      <span>{order.assignee}</span>
                      <em>{order.due}</em>
                    </div>
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
      </section>
    </main>
  );
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

function QRStudio({
  initialAsset,
  onAssetsChanged,
  onOpenScanner
}: {
  initialAsset: AssetRecord | null;
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

  const matchingAssets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return assets.slice(0, 8);

    return assets.filter((item) =>
      [item.id, item.qrCode, item.name, item.ipAddress, item.rack, item.serial, item.macAddress, item.switchPort, item.from, item.to]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [assets, search]);

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

  function createQr() {
    const id = createAssetId();
    const now = new Date().toISOString();
    setAsset((current) => ({ ...current, id, qrCode: id, createdAt: now, updatedAt: now }));
    setMessage(`Created QR ${id}`);
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
    await onAssetsChanged();
    setMessage(`Saved ${savedAsset.id}`);
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

    if (!found) {
      setMessage(`No asset found for ${id}`);
      return;
    }

    setAsset(found);
    setMessage(`Opened ${found.id}`);
  }

  function printLabel() {
    setMessage(`Print label prepared for ${asset.id}`);
    window.setTimeout(() => window.print(), 50);
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
      <div className="qr-studio-head">
        <div>
          <p>QR Studio</p>
          <h1>Infrastructure Asset Labeling</h1>
          <span>{message}</span>
        </div>
        <div className="qr-head-actions">
          <button onClick={onOpenScanner} type="button">Scan QR</button>
          <button onClick={createQr} type="button">Create QR</button>
          <button onClick={() => void saveAsset()} type="button">Save Asset</button>
          <button onClick={printLabel} type="button">Print Label</button>
        </div>
      </div>

      <div className="qr-layout">
        <section className="ops-card qr-editor-card">
          <header>
            <h2>Asset Form Editor</h2>
            <button onClick={() => setAsset(emptyAsset())} type="button">New Asset</button>
          </header>

          <div className="form-section">
            <h3>Basic</h3>
            <div className="field-grid">
              <Field label="Asset Name" value={asset.name} onChange={(value) => updateAsset("name", value)} />
              <SelectField label="Asset Type" value={asset.assetType} options={assetTypes} onChange={(value) => updateAsset("assetType", value)} />
              <Field label="QR ID" value={asset.id} onChange={(value) => updateAsset("id", value)} />
              <Field label="Serial Number" value={asset.serial} onChange={(value) => updateAsset("serial", value)} />
              <SelectField label="Status" value={asset.status} options={assetStatuses} onChange={(value) => updateAsset("status", value as AssetStatus)} />
            </div>
          </div>

          <div className="form-section">
            <h3>Location</h3>
            <div className="field-grid">
              <Field label="Site" value={asset.site} onChange={(value) => updateAsset("site", value)} />
              <Field label="Room" value={asset.room} onChange={(value) => updateAsset("room", value)} />
              <Field label="Rack" value={asset.rack} onChange={(value) => updateAsset("rack", value)} />
              <Field label="RU Position" value={asset.ruPosition} onChange={(value) => updateAsset("ruPosition", value)} />
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

          <div className="form-section">
            <h3>Cable</h3>
            <div className="field-grid">
              <Field label="Cable Type" value={asset.cableType} onChange={(value) => updateAsset("cableType", value)} />
              <Field label="Length" value={asset.length} onChange={(value) => updateAsset("length", value)} />
              <Field label="Connector Type" value={asset.connectorType} onChange={(value) => updateAsset("connectorType", value)} />
              <Field label="From" value={asset.from} onChange={(value) => updateAsset("from", value)} />
              <Field label="To" value={asset.to} onChange={(value) => updateAsset("to", value)} />
            </div>
          </div>

          <div className="form-section">
            <h3>Additional</h3>
            <div className="field-grid">
              <Field label="Owner" value={asset.owner} onChange={(value) => updateAsset("owner", value)} />
              <Field label="Tags" value={asset.tags} onChange={(value) => updateAsset("tags", value)} />
              <Field label="Last Updated" value={new Date(asset.updatedAt).toLocaleString()} readOnly />
              <label className="field wide-field">
                <span>Notes</span>
                <textarea value={asset.notes} onChange={(event) => updateAsset("notes", event.target.value)} />
              </label>
            </div>
          </div>
        </section>

        <aside className="qr-side">
          <section className="ops-card qr-preview-card">
            <header>
              <h2>Live QR Preview</h2>
              <button onClick={downloadQr} type="button">Download QR</button>
            </header>

            <div className="qr-code-box">
              {qrImage ? <img alt="Asset QR code" src={qrImage} /> : <span>Generating QR</span>}
            </div>

            <div className="label-preview print-label">
              <div>
                <strong>{asset.name || "Unnamed Asset"}</strong>
                <span>{asset.assetType} / {asset.id}</span>
              </div>
              {qrImage && <img alt="Printable asset QR code" src={qrImage} />}
              <small>{asset.site || "Site"} {asset.room && `/ ${asset.room}`} {asset.rack && `/ ${asset.rack}`} {asset.ruPosition && `/ RU ${asset.ruPosition}`}</small>
              <em>{qrPayload}</em>
            </div>

            <div className="qr-action-grid">
              <button onClick={printLabel} type="button">Print Label</button>
              <button onClick={downloadQr} type="button">Download QR</button>
              <button onClick={() => void duplicateAsset()} type="button">Duplicate Asset</button>
            </div>
          </section>

          <section className="ops-card asset-search-card">
            <header>
              <h2>Asset Search</h2>
              <button onClick={() => setSearch("")} type="button">Clear</button>
            </header>
            <div className="asset-search-tools">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="QR ID, name, IP, rack, serial, MAC..." />
              <div className="scan-open-row">
                <input value={scanValue} onChange={(event) => setScanValue(event.target.value)} placeholder="patchpilot://asset/PP-000128" />
                <button onClick={() => void openFromScan()} type="button">Open</button>
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
              <h2>Database Schema</h2>
            </header>
            <pre>{assetTableSchema}</pre>
          </section>
        </aside>
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

function PriorityPill({ priority }: { priority: Severity }) {
  return <span className={`priority-pill ${priority.toLowerCase()}`}>{priority}</span>;
}
