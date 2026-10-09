import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  RBox, Cyl, OfficeChair, Sofa, CoffeeTable, Plant, WallClock,
  GalonDispenser, Safe, FilingCabinet, AirConditioner, Television, PrayerRug
} from '../scene3d/props.tsx'

interface OfficeItem {
  id: number
  name: string
  code: string
  kode_kantor: string
  address: string
  phone: string
}

interface StaffMember {
  id: number
  name: string
  email: string
  role_id: number
  role_name: string
}

interface BranchLiveData {
  ok: boolean
  office: OfficeItem
  offices: OfficeItem[]
  staff: {
    bm: StaffMember | null
    teller: StaffMember | null
    marketing: StaffMember[]
  }
  session: {
    id: number
    user_id: number
    status: string
    opening_balance: number
    system_balance: number
    opened_at: string
  } | null
  savingStats: {
    count: number
    total_saldo: number
  }
  financingStats: {
    count: number
    total_outstanding: number
  }
  recentTx: Array<{
    id: number
    transaction_type: string
    amount: number
    description: string
    created_at: string
    account_number: string
    member_name: string
  }>
  networkSummary: {
    totalOffices: number
    totalSavingAccounts: number
    totalFinancingAccounts: number
    totalJournals: number
  }
}

type CameraPreset = 'wide' | 'teller' | 'marketing' | 'bm' | 'lounge'

const PRESET_CAMERAS: Record<CameraPreset, { position: [number, number, number]; target: [number, number, number]; label: string; icon: string }> = {
  wide: { position: [0, 9.5, 12], target: [0, 0.5, 0], label: 'Keseluruhan Cabang', icon: '🏢' },
  teller: { position: [-3.8, 2.4, 3.2], target: [-4.2, 1.2, -0.4], label: 'Loket Teller', icon: '💵' },
  marketing: { position: [3.8, 2.5, 4.2], target: [3.5, 1.1, 0.8], label: 'Meja Marketing', icon: '📝' },
  bm: { position: [3.6, 2.6, -1.0], target: [3.6, 1.2, -4.0], label: 'Ruang Pimpinan BM', icon: '👔' },
  lounge: { position: [-0.2, 3.0, 5.8], target: [-0.2, 1.0, 2.0], label: 'Ruang Tunggu Nasabah', icon: '🛋️' }
}

const legGeometry = new THREE.BoxGeometry(0.16, 0.6, 0.18).translate(0, -0.3, 0)
const armGeometry = new THREE.BoxGeometry(0.12, 0.5, 0.14).translate(0, -0.25, 0)

function BranchAvatar({
  position,
  facing = 0,
  shirtColor = '#1f6f5c',
  pantsColor = '#242a30',
  skinColor = '#d99f7d',
  hairColor = '#1d1a16',
  hasHijab = false,
  hasPeci = false,
  hijabColor = '#2e7d32',
  peciColor = '#1a1a1a',
  name,
  roleTitle,
  isTyping = false,
  isTalking = false,
  onClick
}: {
  position: [number, number, number]
  facing?: number
  shirtColor?: string
  pantsColor?: string
  skinColor?: string
  hairColor?: string
  hasHijab?: boolean
  hasPeci?: boolean
  hijabColor?: string
  peciColor?: string
  name: string
  roleTitle: string
  isTyping?: boolean
  isTalking?: boolean
  onClick?: () => void
}) {
  const root = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Mesh>(null)
  const rightArm = useRef<THREE.Mesh>(null)
  const leftLeg = useRef<THREE.Mesh>(null)
  const rightLeg = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (isTyping && leftArm.current && rightArm.current) {
      leftArm.current.rotation.x = -1.15 + Math.sin(t * 12) * 0.1
      rightArm.current.rotation.x = -1.15 + Math.cos(t * 12) * 0.1
    } else if (isTalking && leftArm.current && rightArm.current) {
      leftArm.current.rotation.x = -0.5 + Math.sin(t * 4) * 0.25
      rightArm.current.rotation.x = -0.2 + Math.cos(t * 3) * 0.15
    }
  })

  return (
    <group
      ref={root}
      position={position}
      rotation={[0, facing, 0]}
      name={`${roleTitle}: ${name}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      {/* Legs (seated) */}
      <mesh ref={leftLeg} position={[-0.1, 0.58, 0]} rotation={[-Math.PI / 2.2, 0, 0]} geometry={legGeometry} castShadow>
        <meshStandardMaterial color={pantsColor} roughness={0.8} />
      </mesh>
      <mesh ref={rightLeg} position={[0.1, 0.58, 0]} rotation={[-Math.PI / 2.2, 0, 0]} geometry={legGeometry} castShadow>
        <meshStandardMaterial color={pantsColor} roughness={0.8} />
      </mesh>

      {/* Torso */}
      <RBox position={[0, 0.88, 0]} size={[0.46, 0.54, 0.28]} radius={0.06} color={shirtColor} roughness={0.85} />

      {/* Arms */}
      <mesh ref={leftArm} position={[-0.29, 1.08, 0]} geometry={armGeometry} castShadow>
        <meshStandardMaterial color={shirtColor} roughness={0.85} />
      </mesh>
      <mesh ref={rightArm} position={[0.29, 1.08, 0]} geometry={armGeometry} castShadow>
        <meshStandardMaterial color={shirtColor} roughness={0.85} />
      </mesh>

      {/* Head & Face */}
      <RBox position={[0, 1.38, 0]} size={[0.36, 0.36, 0.34]} radius={0.08} color={skinColor} roughness={0.7} />
      <RBox position={[-0.08, 1.4, 0.17]} size={[0.05, 0.06, 0.01]} radius={0.003} color="#15181a" shadow={false} />
      <RBox position={[0.08, 1.4, 0.17]} size={[0.05, 0.06, 0.01]} radius={0.003} color="#15181a" shadow={false} />
      <RBox position={[0, 1.28, 0.17]} size={[0.1, 0.02, 0.01]} radius={0.003} color="#8a4b38" shadow={false} />

      {/* Hijab / Peci / Hair */}
      {hasHijab ? (
        <>
          <RBox position={[0, 1.45, -0.02]} size={[0.42, 0.38, 0.4]} radius={0.1} color={hijabColor} roughness={0.9} />
          <RBox position={[0, 1.15, -0.05]} size={[0.44, 0.28, 0.32]} radius={0.08} color={hijabColor} roughness={0.9} />
        </>
      ) : hasPeci ? (
        <>
          <RBox position={[0, 1.58, 0]} size={[0.34, 0.16, 0.32]} radius={0.04} color={peciColor} roughness={0.9} />
          <RBox position={[0, 1.5, -0.16]} size={[0.38, 0.22, 0.06]} radius={0.03} color={hairColor} roughness={0.9} />
        </>
      ) : (
        <>
          <RBox position={[0, 1.58, -0.02]} size={[0.39, 0.12, 0.37]} radius={0.04} color={hairColor} roughness={0.9} />
          <RBox position={[0, 1.46, -0.17]} size={[0.39, 0.26, 0.05]} radius={0.03} color={hairColor} roughness={0.9} />
        </>
      )}

      {/* ID Badge Lanyard */}
      <RBox position={[0, 0.88, 0.145]} size={[0.1, 0.14, 0.01]} radius={0.005} color="#ffffff" shadow={false} />
      <RBox position={[0, 0.9, 0.15]} size={[0.08, 0.05, 0.005]} radius={0.002} color="#0f5132" shadow={false} />
    </group>
  )
}

function BranchRoomModel({ data, onSelectAvatar }: { data: BranchLiveData | null; onSelectAvatar: (role: string, name: string) => void }) {
  const tellerName = data?.staff.teller?.name || 'Teller Kasir Cabang'
  const bmName = data?.staff.bm?.name || 'Branch Manager Cabang'
  const marketingName = data?.staff.marketing[0]?.name || 'Marketing Syariah Cabang'

  return (
    <group position={[0, 0, 0]}>
      {/* 1. FLOOR - Modern Minimalist Microcement & Light Oak Inset */}
      {/* Base Foundation & Polished Microcement Floor */}
      <RBox position={[0, -0.06, 0]} size={[15.8, 0.12, 11.8]} radius={0.03} color="#2b2e33" roughness={0.7} />
      <RBox position={[0, -0.02, 0]} size={[15.4, 0.06, 11.4]} radius={0.02} color="#ede9e1" roughness={0.35} metalness={0.05} />
      {/* Light Oak Parquet Inlay for Consult & Lounge Zone */}
      <RBox position={[4.2, 0.005, 1.8]} size={[4.8, 0.02, 3.8]} radius={0.03} color="#d4b28c" roughness={0.55} />
      {/* Gen Z Lounge Aesthetic Rug */}
      <RBox position={[-0.5, 0.01, 2.2]} size={[4.6, 0.02, 3.6]} radius={0.08} color="#ded9cd" roughness={0.9} />
      <RBox position={[-0.5, 0.015, 2.2]} size={[3.8, 0.01, 2.8]} radius={0.06} color="#40534c" roughness={0.95} />

      {/* 2. WALLS - Japandi Warm Off-White & Slatted Wood Feature Walls */}
      {/* Back Wall */}
      <RBox position={[0, 2.0, -5.7]} size={[15.6, 4.0, 0.2]} radius={0.05} color="#f6f4ee" roughness={0.8} />
      {/* Left Wall */}
      <RBox position={[-7.7, 2.0, 0]} size={[0.2, 4.0, 11.6]} radius={0.05} color="#f3efe8" roughness={0.8} />
      {/* Right Wall */}
      <RBox position={[7.7, 2.0, 0]} size={[0.2, 4.0, 11.6]} radius={0.05} color="#f3efe8" roughness={0.8} />

      {/* Acoustic Vertical Wood Slat Feature Wall (Center Back) */}
      <RBox position={[-1.2, 2.4, -5.58]} size={[5.4, 3.0, 0.08]} radius={0.04} color="#c8a57e" roughness={0.6} />
      {/* Individual wood slat relief lines */}
      {[-3.6, -3.0, -2.4, -1.8, -1.2, -0.6, 0.0, 0.6, 1.2].map((x) => (
        <RBox key={`slat-${x}`} position={[x, 2.4, -5.53]} size={[0.08, 2.9, 0.03]} radius={0.01} color="#a67c52" roughness={0.5} />
      ))}
      {/* Modern Minimalist Backlit Logo Panel */}
      <RBox position={[-1.2, 2.7, -5.48]} size={[3.6, 0.9, 0.05]} radius={0.04} color="#1b242b" roughness={0.4} />
      <RBox position={[-1.2, 2.7, -5.45]} size={[3.4, 0.75, 0.02]} radius={0.02} color="#111827" />
      {/* Warm Ambient LED Glow Trim */}
      <RBox position={[-1.2, 3.92, -5.52]} size={[5.4, 0.06, 0.04]} radius={0.01} color="#ffe8b3" />
      <RBox position={[-1.2, 0.92, -5.52]} size={[5.4, 0.06, 0.04]} radius={0.01} color="#ffe8b3" />

      {/* 3. PARTITION ROOM FOR BRANCH MANAGER (Modern Minimalist Glass Cube) */}
      {/* Slim Black Metal Grid Framing & Glass Partition */}
      <RBox position={[1.8, 1.6, -3.2]} size={[0.06, 3.2, 4.8]} radius={0.01} color="#1e2329" roughness={0.3} />
      <RBox position={[1.8, 1.6, -3.2]} size={[0.02, 3.1, 4.6]} radius={0.01} color="#dbeafe" opacity={0.32} roughness={0.05} />
      {/* Front Glass Wall with Door Frame */}
      <RBox position={[4.6, 1.6, -0.85]} size={[5.6, 3.2, 0.06]} radius={0.01} color="#1e2329" roughness={0.3} />
      <RBox position={[5.4, 1.6, -0.85]} size={[3.8, 3.1, 0.02]} radius={0.01} color="#dbeafe" opacity={0.32} roughness={0.05} />
      {/* Frameless Glass Sliding Doorway */}
      <RBox position={[2.6, 1.3, -0.85]} size={[1.3, 2.6, 0.08]} radius={0.02} color="#111827" roughness={0.5} />
      <RBox position={[2.6, 1.3, -0.85]} size={[1.15, 2.45, 0.02]} radius={0.01} color="#93c5fd" opacity={0.25} />

      {/* 4. TELLER COUNTER ZONE (Floating Quartz & Fluted Oak Minimalist Counter) */}
      <group position={[-4.5, 0, -0.4]}>
        {/* Main Floating Oak Base */}
        <RBox position={[0, 0.55, 0]} size={[4.2, 1.1, 1.0]} radius={0.04} color="#c8a57e" roughness={0.6} />
        {/* Top Pure White Quartz Surface with Soft Bevel */}
        <RBox position={[0, 1.16, 0]} size={[4.35, 0.08, 1.15]} radius={0.03} color="#ffffff" roughness={0.2} metalness={0.05} />
        {/* Warm Golden LED Under-counter Glow */}
        <RBox position={[0, 1.11, 0.55]} size={[4.2, 0.03, 0.06]} radius={0.01} color="#fde047" />
        {/* Front Fluted Wood Slat Texture Accent */}
        <RBox position={[0, 0.55, 0.52]} size={[4.0, 0.85, 0.04]} radius={0.02} color="#b38a60" roughness={0.5} />
        {[-1.6, -1.2, -0.8, -0.4, 0, 0.4, 0.8, 1.2, 1.6].map((sx) => (
          <RBox key={`t-slat-${sx}`} position={[sx, 0.55, 0.55]} size={[0.04, 0.8, 0.02]} radius={0.01} color="#8c6239" />
        ))}

        {/* Frameless Tempered Glass Barrier with Minimalist Pass-through Openings */}
        <RBox position={[-1.0, 1.62, 0.15]} size={[1.85, 0.78, 0.03]} radius={0.02} color="#e0f2fe" opacity={0.35} roughness={0.05} />
        <RBox position={[1.0, 1.62, 0.15]} size={[1.85, 0.78, 0.03]} radius={0.02} color="#e0f2fe" opacity={0.35} roughness={0.05} />
        {/* Slim Black Anodized Glass Clamps */}
        <RBox position={[-1.85, 1.25, 0.15]} size={[0.04, 0.12, 0.06]} radius={0.01} color="#1e2329" metalness={0.7} />
        <RBox position={[-0.1, 1.25, 0.15]} size={[0.04, 0.12, 0.06]} radius={0.01} color="#1e2329" metalness={0.7} />
        <RBox position={[1.85, 1.25, 0.15]} size={[0.04, 0.12, 0.06]} radius={0.01} color="#1e2329" metalness={0.7} />

        {/* Minimalist Counter LED Indicators */}
        <RBox position={[-1.0, 2.05, 0.15]} size={[0.9, 0.18, 0.03]} radius={0.02} color="#065f46" />
        <RBox position={[1.0, 2.05, 0.15]} size={[0.9, 0.18, 0.03]} radius={0.02} color="#334155" />

        {/* Equipment: Loket 1 - Ultra Slim Workspace */}
        <RBox position={[-1.0, 1.42, -0.2]} size={[0.56, 0.34, 0.03]} radius={0.02} color="#0f172a" roughness={0.3} />
        <Cyl position={[-1.0, 1.27, -0.2]} radius={0.025} height={0.16} color="#64748b" metalness={0.8} />
        <RBox position={[-1.0, 1.21, -0.05]} size={[0.42, 0.012, 0.16]} radius={0.01} color="#1e293b" />
        {/* Modern Cash Counter & Receipt Printer */}
        <RBox position={[-1.6, 1.28, -0.15]} size={[0.28, 0.2, 0.24]} radius={0.03} color="#f1f5f9" roughness={0.4} />
        <RBox position={[-0.4, 1.26, -0.2]} size={[0.34, 0.16, 0.24]} radius={0.03} color="#e2e8f0" roughness={0.4} />

        {/* Equipment: Loket 2 (Standby) */}
        <RBox position={[1.0, 1.42, -0.2]} size={[0.56, 0.34, 0.03]} radius={0.02} color="#0f172a" roughness={0.3} />
        <Cyl position={[1.0, 1.27, -0.2]} radius={0.025} height={0.16} color="#64748b" metalness={0.8} />

        {/* Ergonomic Minimalist Mesh Chairs */}
        <OfficeChair position={[-1.0, 0, -0.8]} rotation={0} color="#1e293b" />
        <OfficeChair position={[1.0, 0, -0.8]} rotation={0} color="#475569" />

        {/* TELLER AVATAR (Loket 1) */}
        <BranchAvatar
          position={[-1.0, 0.25, -0.75]}
          facing={0}
          hasHijab={true}
          hijabColor="#198754"
          shirtColor="#f8f9fa"
          pantsColor="#212529"
          name={tellerName}
          roleTitle="Teller Kasir"
          isTyping={true}
          onClick={() => onSelectAvatar('Teller', tellerName)}
        />

        {/* Customer at Teller Counter */}
        <BranchAvatar
          position={[-1.0, 0, 1.3]}
          facing={Math.PI}
          hasHijab={false}
          hasPeci={true}
          peciColor="#111111"
          shirtColor="#20c997"
          pantsColor="#343a40"
          name="Nasabah (Setor Tunai)"
          roleTitle="Anggota BMT"
          isTalking={true}
          onClick={() => onSelectAvatar('Anggota', 'Nasabah Loket')}
        />
      </group>

      {/* 5. MARKETING & CUSTOMER SERVICE DESK (Modern Scandinavian Consult Pod) */}
      <group position={[4.2, 0, 1.8]}>
        {/* Scandinavian Round Oak Consult Table */}
        <Cyl position={[0, 0.4, 0]} radius={1.05} height={0.78} color="#d4b28c" roughness={0.6} />
        <Cyl position={[0, 0.8, 0]} radius={1.12} height={0.04} color="#fbfaf8" roughness={0.3} />
        {/* Subtle Brass Base Accent */}
        <Cyl position={[0, 0.04, 0]} radius={0.5} height={0.08} color="#1e2329" metalness={0.7} />

        {/* Marketing Ergonomic Chair */}
        <OfficeChair position={[0, 0, -0.85]} rotation={0} color="#1b4332" />

        {/* Scandinavian Upholstered Guest Chairs (Sage Green Bouclé) */}
        <OfficeChair position={[-0.7, 0, 0.7]} rotation={Math.PI - 0.4} color="#52796f" />
        <OfficeChair position={[0.7, 0, 0.7]} rotation={Math.PI + 0.4} color="#52796f" />

        {/* Modern Props on Consult Table */}
        {/* Sleek Space Grey Tablet / Laptop */}
        <RBox position={[0, 0.83, -0.1]} size={[0.38, 0.015, 0.26]} radius={0.01} color="#64748b" metalness={0.8} />
        <RBox position={[0, 0.96, -0.22]} size={[0.38, 0.24, 0.015]} rotation={[-0.3, 0, 0]} radius={0.01} color="#0f172a" />
        {/* Minimalist Ceramic Planter with Monstera Leaf */}
        <Cyl position={[-0.55, 0.86, -0.1]} radius={0.07} height={0.12} color="#ffffff" roughness={0.2} />
        <RBox position={[-0.55, 0.98, -0.1]} size={[0.18, 0.16, 0.01]} rotation={[0.2, 0.4, 0]} radius={0.01} color="#10b981" />
        {/* Digital Akad Folder */}
        <RBox position={[0.5, 0.83, 0.05]} size={[0.26, 0.02, 0.2]} radius={0.01} color="#059669" />

        {/* MARKETING AVATAR */}
        <BranchAvatar
          position={[0, 0.25, -0.8]}
          facing={0}
          hasPeci={true}
          shirtColor="#0284c7"
          pantsColor="#1e293b"
          name={marketingName}
          roleTitle="Marketing Syariah"
          isTalking={true}
          onClick={() => onSelectAvatar('Marketing', marketingName)}
        />

        {/* Customer Consulting */}
        <BranchAvatar
          position={[-0.7, 0.25, 0.65]}
          facing={Math.PI - 0.4}
          hasHijab={true}
          hijabColor="#e11d48"
          shirtColor="#fecdd3"
          name="Ibu Rahayu"
          roleTitle="Calon Anggota Pembiayaan"
          onClick={() => onSelectAvatar('Anggota', 'Ibu Rahayu')}
        />
      </group>

      {/* 6. RUANG BRANCH MANAGER (Minimalist Glass-Box Suite) */}
      <group position={[4.6, 0, -3.8]}>
        {/* Floating Natural Oak & Matte Black Desk */}
        <RBox position={[0, 0.4, 0]} size={[2.4, 0.8, 1.15]} radius={0.03} color="#c8a57e" roughness={0.6} />
        <RBox position={[0, 0.81, 0]} size={[2.45, 0.04, 1.2]} radius={0.02} color="#fbfaf8" roughness={0.3} metalness={0.05} />
        <RBox position={[0, 0.4, 0]} size={[2.2, 0.74, 0.9]} radius={0.02} color="#1e293b" />

        {/* Caramel Cognac Leather Executive Chair */}
        <OfficeChair position={[0, 0, -0.85]} rotation={0} color="#b45309" />

        {/* Safe for cash/collateral vault */}
        <Safe position={[2.2, 0, -1.2]} rotation={Math.PI / 2} />

        {/* Minimalist Matte Black Document Credenza */}
        <FilingCabinet position={[-1.8, 0, -1.2]} rotation={0} color="#1e293b" />

        {/* Desk Props */}
        {/* Sleek Brass BM Nameplate */}
        <RBox position={[0.7, 0.86, 0.35]} size={[0.26, 0.04, 0.06]} radius={0.01} color="#f59e0b" metalness={0.8} />
        {/* Laptop */}
        <RBox position={[0, 0.85, -0.05]} size={[0.42, 0.015, 0.28]} radius={0.01} color="#475569" metalness={0.8} />
        <RBox position={[0, 0.99, -0.18]} size={[0.42, 0.26, 0.015]} rotation={[-0.3, 0, 0]} radius={0.01} color="#0f172a" />
        {/* File Folder Akad BMT */}
        <RBox position={[-0.6, 0.84, 0.1]} size={[0.34, 0.03, 0.24]} radius={0.01} color="#059669" />

        {/* BRANCH MANAGER AVATAR */}
        <BranchAvatar
          position={[0, 0.25, -0.8]}
          facing={0}
          hasPeci={true}
          shirtColor="#0f172a"
          pantsColor="#1e293b"
          name={bmName}
          roleTitle="Branch Manager"
          isTyping={true}
          onClick={() => onSelectAvatar('BM', bmName)}
        />
      </group>

      {/* 7. WAITING LOUNGE & COFFEE CORNER (Gen Z Aesthetic Lounge) */}
      <group position={[-0.5, 0, 2.2]}>
        {/* Curved Organic Bouclé Modular Sofas */}
        <Sofa position={[0, 0, -0.85]} rotation={0} color="#e2dcd2" />
        <Sofa position={[0, 0, 0.85]} rotation={Math.PI} color="#e2dcd2" />

        {/* Dual-Tier Travertine & Oak Minimalist Coffee Table */}
        <CoffeeTable position={[0, 0, 0]} />
        <RBox position={[0, 0.44, 0]} size={[0.3, 0.015, 0.22]} radius={0.01} color="#059669" />

        {/* Customer waiting in lounge */}
        <BranchAvatar
          position={[-0.5, 0.2, -0.8]}
          facing={0}
          hasPeci={false}
          shirtColor="#f97316"
          pantsColor="#1e293b"
          name="Ahmad Fauzi"
          roleTitle="Antrean A-022"
          onClick={() => onSelectAvatar('Nasabah', 'Ahmad Fauzi (Antrean A-022)')}
        />
      </group>

      {/* 8. COMMON PROPS & ROOM ACCESSORIES */}
      {/* Sleek Minimalist 4K Electronic Queue Display */}
      <Television position={[-1.2, 2.6, -5.5]} />

      {/* Zen Musholla Corner with Elevated Bamboo Platform */}
      <group position={[-6.2, 0, -4.2]}>
        {/* Elevated Bamboo Mat Platform */}
        <RBox position={[0, 0.03, 0]} size={[1.8, 0.06, 2.2]} radius={0.02} color="#d4b28c" roughness={0.7} />
        <PrayerRug position={[0, 0.07, 0]} rotation={Math.PI / 4} color="#047857" />
        {/* Directional Brass Qibla Inlay */}
        <RBox position={[0.2, 0.08, -0.4]} size={[0.16, 0.005, 0.24]} rotation={[0, Math.PI / 4, 0]} color="#fbbf24" metalness={0.8} />
        {/* Indirect Warm Glow Base */}
        <RBox position={[0, 0.01, 0]} size={[1.9, 0.02, 2.3]} radius={0.01} color="#fef08a" />
      </group>

      {/* Complimentary Barista Coffee & Water Station for Nasabah */}
      <group position={[-6.4, 0, 1.2]}>
        <GalonDispenser position={[0, 0, 0]} rotation={Math.PI / 2} />
        <RBox position={[0, 0.45, 0.7]} size={[0.6, 0.9, 0.6]} radius={0.02} color="#c8a57e" />
        <RBox position={[0, 0.92, 0.7]} size={[0.65, 0.04, 0.65]} radius={0.01} color="#ffffff" />
        {/* Coffee / Tea mugs */}
        <Cyl position={[-0.1, 0.98, 0.7]} radius={0.04} height={0.08} color="#f8fafc" />
        <Cyl position={[0.1, 0.98, 0.7]} radius={0.04} height={0.08} color="#f8fafc" />
      </group>

      {/* Inverter Air Conditioners */}
      <AirConditioner position={[-4.5, 3.4, -5.6]} rotation={0} />
      <AirConditioner position={[4.5, 3.4, -5.6]} rotation={0} />

      {/* Minimalist Frameless Wall Clock */}
      <WallClock position={[-1.2, 3.3, -5.55]} />

      {/* Aesthetic Tropical Planters (Monstera & Ficus) */}
      <Plant position={[-7.0, 0, -5.0]} size={1.3} />
      <Plant position={[-7.0, 0, 5.0]} size={1.2} />
      <Plant position={[7.0, 0, 5.0]} size={1.2} />
      <Plant position={[-2.4, 0, -5.0]} size={1.0} />
      <Plant position={[1.8, 0, 1.0]} size={0.9} />
    </group>
  )
}

function BranchCameraRig({ preset }: { preset: CameraPreset }) {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)
  const targetConfig = PRESET_CAMERAS[preset]

  useEffect(() => {
    if (!controlsRef.current) return
    controlsRef.current.target.set(...targetConfig.target)
    camera.position.set(...targetConfig.position)
    controlsRef.current.update()
  }, [preset, camera, targetConfig])

  return (
    <primitive
      ref={controlsRef}
      object={useMemo(() => {
        const controls = new OrbitControls(camera, document.querySelector('canvas') as HTMLCanvasElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.maxPolarAngle = Math.PI / 2.05
        controls.minDistance = 2.0
        controls.maxDistance = 26.0
        return controls
      }, [camera])}
    />
  )
}

export function BranchOffice3D({ onNavigate }: { onNavigate?: (page: any) => void }) {
  const [officeId, setOfficeId] = useState<number>(2) // Default Cabang Bareng
  const [data, setData] = useState<BranchLiveData | null>(null)
  const [preset, setPreset] = useState<CameraPreset>('wide')
  const [selectedAvatar, setSelectedAvatar] = useState<{ role: string; name: string } | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch branch data
  const fetchData = async (id: number) => {
    try {
      const res = await fetch(`/api/bmt/cabang-live?office_id=${id}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error('Failed to fetch branch live data', e)
    }
  }

  useEffect(() => {
    fetchData(officeId)
  }, [officeId])

  // Polling simulator real-time mutations
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchData(officeId)
    }, 3500)
    return () => clearInterval(interval)
  }, [officeId, autoRefresh])

  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return 'Rp 0'
    return 'Rp ' + Number(val).toLocaleString('id-ID')
  }

  const office = data?.office
  const offices = data?.offices || []
  const session = data?.session
  const teller = data?.staff.teller
  const bm = data?.staff.bm
  const marketing = data?.staff.marketing || []

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 58px)', background: '#121619', overflow: 'hidden' }}>
      {/* 1. TOP CONTROL BAR */}
      <div style={{
        position: 'absolute', top: 12, left: 16, right: 16, zIndex: 20,
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, pointerEvents: 'none'
      }}>
        {/* Left: Branch Selector Dropdown */}
        <div style={{
          pointerEvents: 'auto', background: 'rgba(21, 27, 33, 0.92)', backdropFilter: 'blur(10px)',
          padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <span style={{ fontSize: 18 }}>🏢</span>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#90a4ae', textTransform: 'uppercase', fontWeight: 600 }}>PILIH KANTOR CABANG</div>
            <select
              value={officeId}
              onChange={(e) => setOfficeId(Number(e.target.value))}
              style={{
                background: 'transparent', color: '#ffffff', border: 'none', outline: 'none',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', minWidth: 220
              }}
            >
              {offices.map((o) => (
                <option key={o.id} value={o.id} style={{ background: '#1e242b', color: '#ffffff' }}>
                  {o.kode_kantor} - {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Camera Presets */}
        <div style={{
          pointerEvents: 'auto', background: 'rgba(21, 27, 33, 0.92)', backdropFilter: 'blur(10px)',
          padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', gap: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          {(Object.keys(PRESET_CAMERAS) as CameraPreset[]).map((key) => {
            const p = PRESET_CAMERAS[key]
            const active = preset === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPreset(key)}
                style={{
                  background: active ? '#198754' : 'transparent',
                  color: active ? '#ffffff' : '#cfd8dc',
                  border: 'none', borderRadius: 6, padding: '6px 12px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s'
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right: Quick HQ & Live Toggle */}
        <div style={{
          pointerEvents: 'auto', background: 'rgba(21, 27, 33, 0.92)', backdropFilter: 'blur(10px)',
          padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              background: autoRefresh ? 'rgba(25, 135, 84, 0.2)' : 'rgba(108, 117, 125, 0.2)',
              color: autoRefresh ? '#20c997' : '#adb5bd',
              border: `1px solid ${autoRefresh ? '#20c997' : '#6c757d'}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer'
            }}
          >
            {autoRefresh ? '● LIVE SYNC ON' : '○ SYNC PAUSED'}
          </button>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('Office')}
              style={{
                background: '#0d6efd', color: '#ffffff', border: 'none',
                borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              🏛️ Ke Kantor Pusat (HQ)
            </button>
          )}
        </div>
      </div>

      {/* 2. THREE.JS 3D CANVAS */}
      <Canvas
        shadows
        camera={{ position: PRESET_CAMERAS.wide.position, fov: 42 }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#171d22']} />
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[6, 12, 8]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-near={0.5}
          shadow-camera-far={32}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-4.5, 3.2, 0]} intensity={0.6} color="#ffffff" />
        <pointLight position={[4.2, 3.2, 1.8]} intensity={0.6} color="#ffffff" />
        <pointLight position={[4.6, 3.2, -3.8]} intensity={0.6} color="#ffffff" />

        <BranchCameraRig preset={preset} />
        <BranchRoomModel
          data={data}
          onSelectAvatar={(role, name) => setSelectedAvatar({ role, name })}
        />
      </Canvas>

      {/* 3. FLOATING HUD OVERLAY (Left Card) */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, width: 340, zIndex: 20,
        background: 'rgba(21, 27, 33, 0.94)', backdropFilter: 'blur(12px)',
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)', overflow: 'hidden', color: '#f8f9fa'
      }}>
        {/* Header */}
        <div style={{ background: '#134e35', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#a3cfbb', fontWeight: 600 }}>INFORMASI CABANG AKTIF</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff' }}>{office?.name || 'Kantor Cabang'}</div>
          <div style={{ fontSize: 11, color: '#e9ecef', opacity: 0.85 }}>{office?.address || '-'}</div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
          {/* Kasir Status */}
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#90a4ae' }}>Status Sesi Kasir:</span>
              <span style={{ color: session?.status === 'open' ? '#20c997' : '#ffc107', fontWeight: 700 }}>
                {session?.status === 'open' ? '● BUKA (Aktif)' : '○ BELUM DIBUKA'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#90a4ae' }}>Saldo Kas Teller:</span>
              <span style={{ color: '#ffffff', fontWeight: 700 }}>{formatRupiah(session?.system_balance ?? session?.opening_balance ?? 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#90a4ae' }}>Staf Teller Kasir:</span>
              <span style={{ color: '#20c997', fontWeight: 600 }}>{teller?.name || 'Tersedia'}</span>
            </div>
          </div>

          {/* Portofolio Rekening */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#90a4ae' }}>TABUNGAN AKTIF</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>{data?.savingStats.count ?? 0} Rekening</div>
              <div style={{ fontSize: 10, color: '#20c997' }}>{formatRupiah(data?.savingStats.total_saldo)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#90a4ae' }}>PEMBIAYAAN</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>{data?.financingStats.count ?? 0} Akad</div>
              <div style={{ fontSize: 10, color: '#0dcaf0' }}>{formatRupiah(data?.financingStats.total_outstanding)}</div>
            </div>
          </div>

          {/* Personel Cabang */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
            <div style={{ fontSize: 10, color: '#90a4ae', fontWeight: 600, marginBottom: 4 }}>PERSONEL STRUKTURAL:</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: '#ced4da' }}>Branch Manager (BM):</span>
              <span style={{ color: '#ffc107', fontWeight: 600 }}>{bm?.name || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: '#ced4da' }}>Marketing Pembiayaan:</span>
              <span style={{ color: '#0dcaf0', fontWeight: 600 }}>{marketing[0]?.name || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME TRANSACTIONS FEED (Right Card) */}
      <div style={{
        position: 'absolute', bottom: 16, right: 16, width: 360, maxHeight: 320, zIndex: 20,
        background: 'rgba(21, 27, 33, 0.94)', backdropFilter: 'blur(12px)',
        borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)', overflow: 'hidden', color: '#f8f9fa',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ background: '#1c242c', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.08em', color: '#90a4ae', fontWeight: 600 }}>LIVE ACTIVITY STREAM</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#20c997' }}>⚡ Mutasi Transaksi Cabang Ini</div>
          </div>
          <span style={{ fontSize: 11, background: 'rgba(32, 201, 151, 0.15)', color: '#20c997', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
            {data?.recentTx.length ?? 0} Log
          </span>
        </div>

        <div style={{ padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 250 }}>
          {data?.recentTx && data.recentTx.length > 0 ? (
            data.recentTx.map((tx) => (
              <div key={tx.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: 6, borderLeft: '3px solid #20c997' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                  <span style={{ color: '#ffffff' }}>{tx.member_name || tx.account_number}</span>
                  <span style={{ color: '#20c997' }}>{formatRupiah(tx.amount)}</span>
                </div>
                <div style={{ fontSize: 10, color: '#adb5bd', marginTop: 2 }}>{tx.description}</div>
                <div style={{ fontSize: 9, color: '#6c757d', marginTop: 2 }}>{tx.created_at}</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 12px', color: '#6c757d', fontSize: 12 }}>
              Belum ada mutasi baru di cabang ini. Simulator terus berjalan melayani antrean...
            </div>
          )}
        </div>
      </div>

      {/* 5. MODAL DETAIL AVATAR */}
      {selectedAvatar && (
        <div
          onClick={() => setSelectedAvatar(null)}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a2228', borderRadius: 12, padding: 20, width: 380,
              border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              color: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#20c997' }}>Profil Petugas Cabang</div>
              <button
                type="button"
                onClick={() => setSelectedAvatar(null)}
                style={{ background: 'transparent', border: 'none', color: '#adb5bd', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedAvatar.name}</div>
            <div style={{ fontSize: 12, color: '#ffc107', marginTop: 2 }}>Peran: {selectedAvatar.role}</div>
            <div style={{ fontSize: 12, color: '#ced4da', marginTop: 8, lineHeight: 1.5 }}>
              Bertugas di unit kerja <strong>{office?.name}</strong>. Menangani pelayanan operasional syariah, kepatuhan transaksi, dan pelaporan real-time ke Kantor Pusat BMT NU.
            </div>
            <button
              type="button"
              onClick={() => setSelectedAvatar(null)}
              style={{
                marginTop: 16, width: '100%', padding: '8px 0', background: '#198754',
                color: '#ffffff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
