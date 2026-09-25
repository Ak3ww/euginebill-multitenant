'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { showSuccess, showError, showConfirm } from '@/lib/sweetalert';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Search,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  RefreshCcw,
  CheckCircle2,
  ExternalLink,
  Boxes,
  MapPin,
  RefreshCw,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import {
  SimpleModal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalInput,
  ModalSelect,
  ModalTextarea,
  ModalLabel,
  ModalButton,
} from '@/components/cyberpunk';

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Item {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryCode?: string;
  isSerialized?: boolean;
  supplierId?: string;
  unit: string;
  packUnit?: string;
  packSize?: number;
  minimumStock: number;
  currentStock: number;
  purchasePrice: number;
  sellingPrice: number;
  location?: string;
  notes?: string;
  isActive: boolean;
  category?: Category;
  supplier?: Supplier;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  _count?: {
    assets?: number;
  };
}

interface ReconcileStats {
  totalCustomers: number;
  customersWithActiveOnt: number;
  customersWithoutOnt: number;
  totalModemAssets: number;
  availableModems: number;
  inUseModems: number;
  customersWithMismatchedOnt: number;
}

export default function InventoryItemsPage() {
  const { t } = useTranslation();
  const { company } = useAppStore();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    supplierId: '',
    unit: 'pcs',
    packUnit: 'Pack',
    packSize: 100,
    minimumStock: 0,
    currentStock: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    location: '',
    notes: '',
    isSerialized: false,
    isActive: true,
  });

  // ONT Reconciliation Modal State
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileStats, setReconcileStats] = useState<ReconcileStats | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, categoriesRes, suppliersRes] = await Promise.all([
        fetch('/api/inventory/items'),
        fetch('/api/inventory/categories'),
        fetch('/api/inventory/suppliers'),
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
    } catch (error) {
      await showError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      categoryId: '',
      supplierId: '',
      unit: 'pcs',
      packUnit: 'Pack',
      packSize: 100,
      minimumStock: 0,
      currentStock: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      location: '',
      notes: '',
      isSerialized: false,
      isActive: true,
    });
    setEditingItem(null);
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      sku: item.sku,
      name: item.name,
      description: item.description || '',
      categoryId: item.categoryId || '',
      supplierId: item.supplierId || '',
      unit: item.unit || 'pcs',
      packUnit: item.packUnit || 'Pack',
      packSize: item.packSize || 100,
      minimumStock: item.minimumStock || 0,
      currentStock: item.currentStock || 0,
      purchasePrice: item.purchasePrice || 0,
      sellingPrice: item.sellingPrice || 0,
      location: item.location || '',
      notes: item.notes || '',
      isSerialized: item.isSerialized ?? false,
      isActive: item.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      await showError(t('inventory.itemNameRequired'));
      return;
    }

    // Auto-generate default SKU if empty
    let finalSku = formData.sku.trim();
    if (!finalSku) {
      const selectedCat = categories.find((c) => c.id === formData.categoryId);
      const prefix = selectedCat
        ? selectedCat.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'CAT')
        : 'INV';
      const namePart = formData.name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10) || 'ITEM';
      finalSku = `${prefix}-${namePart}-${Math.floor(100 + Math.random() * 900)}`;
    }

    try {
      const method = editingItem ? 'PUT' : 'POST';
      const payload = {
        ...formData,
        sku: finalSku,
        packSize: formData.packSize ? Number(formData.packSize) : null,
        packUnit: formData.packUnit ? formData.packUnit.trim() : null,
        ...(editingItem ? { id: editingItem.id } : {}),
      };

      const res = await fetch('/api/inventory/items', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        await showSuccess(
          editingItem ? t('inventory.itemUpdated') : t('inventory.itemCreated')
        );
        setIsDialogOpen(false);
        resetForm();
        loadData();
      } else {
        await showError(result.error || t('common.error'));
      }
    } catch (error) {
      await showError(t('common.error'));
    }
  };

  const handleDelete = async (item: Item) => {
    const assetCount = item._count?.assets ?? 0;
    if (assetCount > 0) {
      await showError(
        `Barang ini tidak dapat dihapus karena memiliki ${assetCount} unit aset/roll kabel aktif di modul Unit Aset.`
      );
      return;
    }

    const confirmed = await showConfirm(
      t('inventory.deleteItem'),
      t('inventory.deleteItemConfirm', { name: item.name })
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/inventory/items?id=${item.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await showSuccess(t('inventory.itemDeleted'));
        loadData();
      } else {
        const result = await res.json();
        await showError(result.error || t('common.error'));
      }
    } catch (error) {
      await showError(t('common.error'));
    }
  };

  // Open Reconcile Modal & fetch diagnostics
  const handleOpenReconcileModal = async () => {
    setIsReconcileModalOpen(true);
    setReconcileLoading(true);
    setReconcileResult(null);
    try {
      const res = await fetch('/api/admin/inventory/reconcile-customer-ont');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReconcileStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching reconcile stats:', err);
    } finally {
      setReconcileLoading(false);
    }
  };

  const handleRunReconciliation = async () => {
    const confirmed = await showConfirm(
      'Sinkronisasi ONT Pelanggan',
      'Sistem akan mencocokkan SN & MAC pelanggan PPPoE dengan Unit Aset di gudang, dan otomatis mendaftarkan modem jika belum ada. Lanjutkan?'
    );
    if (!confirmed) return;

    setReconciling(true);
    try {
      const res = await fetch('/api/admin/inventory/reconcile-customer-ont', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoCreateMissingModems: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReconcileResult(data);
        await showSuccess(`Rekonsiliasi selesai! ${data.synced} pelanggan tersinkronisasi.`);
        loadData();
        const diagRes = await fetch('/api/admin/inventory/reconcile-customer-ont');
        if (diagRes.ok) {
          const diagData = await diagRes.json();
          setReconcileStats(diagData.stats);
        }
      } else {
        await showError(data.error || 'Gagal menjalankan rekonsiliasi');
      }
    } catch (err) {
      await showError('Terjadi kesalahan saat rekonsiliasi');
    } finally {
      setReconciling(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.categoryCode && item.categoryCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCategory = !filterCategory || item.categoryId === filterCategory;
    const matchSupplier = !filterSupplier || item.supplierId === filterSupplier;
    const matchLowStock =
      !filterLowStock || item.stockStatus === 'low_stock' || item.stockStatus === 'out_of_stock';

    return matchSearch && matchCategory && matchSupplier && matchLowStock;
  });

  const stats = {
    totalItems: items.length,
    lowStock: items.filter((i) => i.stockStatus === 'low_stock').length,
    outOfStock: items.filter((i) => i.stockStatus === 'out_of_stock').length,
    totalValue: items.reduce((sum, i) => sum + i.currentStock * i.purchasePrice, 0),
  };

  const formatStockDisplay = (item: Item) => {
    const baseUnit = item.unit || 'pcs';
    const baseStock = `${item.currentStock} ${baseUnit}`;
    if (item.packSize && item.packSize > 1) {
      const packs = Math.floor(item.currentStock / item.packSize);
      const remainder = item.currentStock % item.packSize;
      const packUnit = item.packUnit || 'Pack';
      const remainderText = remainder > 0 ? ` + ${remainder} ${baseUnit}` : '';
      return `${baseStock} (${packs} ${packUnit} @ ${item.packSize} ${baseUnit}${remainderText})`;
    }
    return baseStock;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-background relative space-y-6">
      {/* Top Module Navigation */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto text-xs font-medium">
        <Link
          href="/admin/inventory/items"
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold border border-primary/20 transition-colors whitespace-nowrap"
        >
          Katalog Master Barang
        </Link>
        <Link
          href="/admin/inventory/ont"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
        >
          Modem ONT Pelanggan
        </Link>
        <Link
          href="/admin/inventory/assets"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
        >
          Unit Aset & Roll Kabel (Tracking SN)
        </Link>
        <Link
          href="/admin/inventory/movements"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
        >
          Riwayat Masuk/Keluar
        </Link>
        <Link
          href="/admin/inventory/kits"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
        >
          Kit Standar SPK
        </Link>
        <Link
          href="/admin/inventory/sku-settings"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
        >
          Setting Kamus SKU
        </Link>
        <Link
          href="/admin/inventory/categories"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
        >
          Kategori
        </Link>
        <Link
          href="/admin/inventory/suppliers"
          className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
        >
          Supplier
        </Link>
      </div>

      <div className="space-y-4">
        {/* Page Title & Reconcile Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              {t('inventory.items')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t('inventory.itemsDesc')} &mdash; Master SKU & data stok global
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenReconcileModal}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Periksa kecocokan data modem ONT pelanggan dengan gudang"
            >
              <RefreshCw className="h-3.5 w-3.5 text-primary" />
              Audit ONT Pelanggan
            </button>
            <button
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              className="px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              {t('inventory.addItem')}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-border p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {t('inventory.totalItems')}
                </p>
                <p className="text-xl font-bold text-foreground mt-0.5">{stats.totalItems}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {t('inventory.lowStock')}
                </p>
                <p className="text-xl font-bold text-amber-600 mt-0.5">{stats.lowStock}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {t('inventory.outOfStock')}
                </p>
                <p className="text-xl font-bold text-destructive mt-0.5">{stats.outOfStock}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {t('inventory.totalValue')}
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Rp {stats.totalValue.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-3">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari nama barang, kode SKU, atau kategori..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto items-center">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2.5 py-1.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary text-xs"
              >
                <option value="">{t('inventory.allCategories')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="px-2.5 py-1.5 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary text-xs"
              >
                <option value="">{t('inventory.allSuppliers')}</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setFilterLowStock(!filterLowStock)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  filterLowStock
                    ? 'bg-amber-600 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('inventory.lowStock')}
              </button>

              <button
                onClick={loadData}
                className="p-1.5 bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors text-xs font-medium"
                title="Muat ulang data"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block md:hidden space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              {t('inventory.noItems')}
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="bg-card rounded-xl border border-border p-3 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                        {item.sku}
                      </span>
                      {item.category && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {item.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${
                      item.stockStatus === 'out_of_stock'
                        ? 'bg-destructive/15 text-destructive'
                        : item.stockStatus === 'low_stock'
                        ? 'bg-amber-500/15 text-amber-600'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {item.stockStatus === 'out_of_stock'
                      ? t('inventory.outOfStock')
                      : item.stockStatus === 'low_stock'
                      ? t('inventory.lowStock')
                      : t('inventory.inStock')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-border">
                  <div className="col-span-2">
                    <span>Stok: </span>
                    <span className="font-semibold text-foreground">
                      {formatStockDisplay(item)}
                    </span>
                    <span className="text-[10px]"> (min: {item.minimumStock})</span>
                  </div>
                  <div>
                    <span>Kategori: </span>
                    <span className="text-foreground">{item.category?.name || '-'}</span>
                  </div>
                  <div>
                    <span>Beli: </span>
                    <span className="text-foreground">Rp {item.purchasePrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div>
                    <span>Jual: </span>
                    <span className="text-foreground">Rp {item.sellingPrice.toLocaleString('id-ID')}</span>
                  </div>
                  {item.location && (
                    <div className="col-span-2 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-foreground">{item.location}</span>
                    </div>
                  )}
                </div>

                {/* Serialized Link if applicable */}
                {(item.isSerialized || item.categoryCode === 'CPE' || item.categoryCode === 'CAB') && (
                  <div className="pt-2 border-t border-border">
                    <Link
                      href={`/admin/inventory/assets?search=${item.sku}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <Boxes className="h-3.5 w-3.5" />
                      Lihat {item._count?.assets ?? 0} Unit Aset Terlacak di Gudang/Pelanggan
                      <ExternalLink className="h-3 w-3 ml-0.5" />
                    </Link>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                    title="Edit Barang"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                    title="Hapus Barang"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Kode SKU
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Nama Barang
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Satuan
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Harga Beli
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Harga Jual
                  </th>
                  <th className="px-3 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isTracked = item.isSerialized || item.categoryCode === 'CPE' || item.categoryCode === 'CAB';
                  const assetCount = item._count?.assets ?? 0;

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-xs">
                        <span className="font-mono font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                          {item.sku}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.location && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {item.location}
                            </span>
                          )}
                          {isTracked && (
                            <Link
                              href={`/admin/inventory/assets?search=${item.sku}`}
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 font-medium"
                              title="Buka pelacakan serial number & roll di modul Unit Aset"
                            >
                              <Boxes className="h-2.5 w-2.5" />
                              {assetCount} Unit Aset
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground">{item.category?.name || item.categoryCode || '-'}</span>
                          {item.isSerialized ? (
                            <span className="text-[9px] text-muted-foreground">Unit Berseri (SN)</span>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">Kuantitas Stok</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <div
                          className={`font-semibold ${
                            item.stockStatus === 'out_of_stock'
                              ? 'text-destructive'
                              : item.stockStatus === 'low_stock'
                              ? 'text-amber-600'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatStockDisplay(item)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Min: {item.minimumStock} {item.unit}</div>
                        {(item as any).deployedCount > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium rounded bg-blue-500/10 text-blue-600 border border-blue-500/30" title="Jumlah unit terpasang aktif di jaringan OLT / ODP / ODC">
                              Terpasang: {(item as any).deployedCount}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground">{item.unit}</td>
                      <td className="px-3 py-2.5 text-xs text-foreground">
                        Rp {item.purchasePrice.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-foreground">
                        Rp {item.sellingPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            item.stockStatus === 'out_of_stock'
                              ? 'bg-destructive/15 text-destructive'
                              : item.stockStatus === 'low_stock'
                              ? 'bg-amber-500/15 text-amber-600'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.stockStatus === 'out_of_stock'
                            ? t('inventory.outOfStock')
                            : item.stockStatus === 'low_stock'
                            ? t('inventory.lowStock')
                            : t('inventory.inStock')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="Edit Barang"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                            title="Hapus Barang"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredItems.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {t('inventory.noItems')}
              </div>
            )}
          </div>
        </div>

        {/* Modal Clean 1-Step Tambah / Edit Barang */}
        <SimpleModal
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingItem(null);
            resetForm();
          }}
          size="lg"
        >
          <ModalHeader>
            <ModalTitle>
              {editingItem ? 'Edit Master Barang' : 'Tambah Master Barang Baru'}
            </ModalTitle>
          </ModalHeader>

          <form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 py-1">
                {/* Nama Barang */}
                <div className="md:col-span-2">
                  <ModalLabel required>Nama Barang</ModalLabel>
                  <ModalInput
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="cth: ZTE F609 V9 GPON ONT, Patch Cord SC-UPC 3m..."
                    required
                  />
                </div>

                {/* Kategori Inventori */}
                <div>
                  <ModalLabel>Kategori Inventori</ModalLabel>
                  <ModalSelect
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </ModalSelect>
                </div>

                {/* Kode SKU */}
                <div>
                  <ModalLabel>Kode SKU</ModalLabel>
                  <ModalInput
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="Auto-generate jika dikosongkan"
                    className="font-mono text-xs"
                  />
                </div>

                {/* Satuan Utama & Satuan Kemasan */}
                <div>
                  <ModalLabel required>Satuan Utama (Base Unit)</ModalLabel>
                  <ModalInput
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="pcs, meter, unit, roll"
                    required
                  />
                </div>

                <div>
                  <ModalLabel>Satuan Kemasan (Pack Unit)</ModalLabel>
                  <ModalInput
                    type="text"
                    value={formData.packUnit}
                    onChange={(e) => setFormData({ ...formData, packUnit: e.target.value })}
                    placeholder="Pack, Box, Dus, Roll, Karton"
                  />
                </div>

                {/* Isi per Kemasan (Pack Size) */}
                <div className="md:col-span-2">
                  <ModalLabel>Isi per Kemasan (Jumlah Base Unit per Pack)</ModalLabel>
                  <ModalInput
                    type="number"
                    value={formData.packSize}
                    onChange={(e) => setFormData({ ...formData, packSize: parseInt(e.target.value) || 1 })}
                    placeholder="100"
                    min={1}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    Contoh: 1 {formData.packUnit || 'Pack'} = {formData.packSize || 100} {formData.unit || 'pcs'}
                  </p>
                </div>

                {/* Batas Minimum Stock & Stok Awal */}
                <div>
                  <ModalLabel>Batas Minimum Stok</ModalLabel>
                  <ModalInput
                    type="number"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({ ...formData, minimumStock: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div>
                  <ModalLabel>Stok Awal Masuk</ModalLabel>
                  <ModalInput
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: parseFloat(e.target.value) || 0 })}
                    disabled={!!editingItem}
                  />
                  {editingItem && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Ubah stok melalui menu Riwayat Masuk/Keluar.
                    </p>
                  )}
                </div>

                {/* Harga Beli & Harga Jual */}
                <div>
                  <ModalLabel>Harga Beli Satuan (Rp)</ModalLabel>
                  <ModalInput
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                <div>
                  <ModalLabel>Harga Jual Satuan (Rp)</ModalLabel>
                  <ModalInput
                    type="number"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>

                {/* Supplier */}
                <div>
                  <ModalLabel>Supplier</ModalLabel>
                  <ModalSelect
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  >
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </ModalSelect>
                </div>

                {/* Lokasi Rak / Gudang */}
                <div>
                  <ModalLabel>Lokasi Rak / Gudang</ModalLabel>
                  <ModalInput
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Gudang A, Rak B-02"
                  />
                </div>

                {/* Deskripsi Barang */}
                <div className="md:col-span-2">
                  <ModalLabel>Deskripsi Barang</ModalLabel>
                  <ModalTextarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Spesifikasi teknis tambahan..."
                  />
                </div>

                {/* Catatan Internal */}
                <div className="md:col-span-2">
                  <ModalLabel>Catatan Internal</ModalLabel>
                  <ModalTextarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={1}
                  />
                </div>

                {/* Toggles */}
                <div className="md:col-span-2 flex flex-wrap items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={formData.isSerialized}
                      onChange={(e) => setFormData({ ...formData, isSerialized: e.target.checked })}
                      className="rounded border-border accent-primary w-4 h-4"
                    />
                    <span>Lacak Satuan Individual (Unit Berseri / Roll Kabel)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-border accent-primary w-4 h-4"
                    />
                    <span>Barang Aktif</span>
                  </label>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <ModalButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingItem(null);
                  resetForm();
                }}
              >
                {t('common.cancel')}
              </ModalButton>
              <ModalButton type="submit" variant="primary">
                {editingItem ? t('common.update') : 'Simpan Master Barang'}
              </ModalButton>
            </ModalFooter>
          </form>
        </SimpleModal>

        {/* Modal Audit & Rekonsiliasi ONT Pelanggan */}
        <SimpleModal
          isOpen={isReconcileModalOpen}
          onClose={() => setIsReconcileModalOpen(false)}
          size="lg"
        >
          <ModalHeader>
            <ModalTitle>Audit & Rekonsiliasi ONT Pelanggan</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4 py-1">
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fitur ini mendiagnosis dan merekonsiliasi keterkaitan antara data pelanggan PPPoE dengan unit fisik modem di gudang/lapangan. Setiap modem yang terpasang di rumah pelanggan akan disinkronkan ke tabel <strong>Unit Aset</strong> dengan status <code>IN_USE</code>.
                </p>
              </div>

              {reconcileLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : reconcileStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Pelanggan PPPoE</span>
                    <p className="text-base font-bold text-foreground mt-0.5">{reconcileStats.totalCustomers}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-emerald-600 font-semibold uppercase">Modem Terhubung (In-Use)</span>
                    <p className="text-base font-bold text-emerald-600 mt-0.5">{reconcileStats.customersWithActiveOnt}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-amber-600 font-semibold uppercase">Belum Tertaut Aset</span>
                    <p className="text-base font-bold text-amber-600 mt-0.5">{reconcileStats.customersWithoutOnt}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Unit Modem di Sistem</span>
                    <p className="text-base font-bold text-foreground mt-0.5">{reconcileStats.totalModemAssets}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Modem Ready di Gudang</span>
                    <p className="text-base font-bold text-foreground mt-0.5">{reconcileStats.availableModems}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-destructive uppercase font-semibold">Modem Tidak Cocok</span>
                    <p className="text-base font-bold text-destructive mt-0.5">{reconcileStats.customersWithMismatchedOnt}</p>
                  </div>
                </div>
              ) : null}

              {reconcileResult && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Hasil Rekonsiliasi Terakhir:
                  </p>
                  <p className="text-muted-foreground">
                    &bull; Pelanggan disinkronkan: <strong>{reconcileResult.synced}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    &bull; Modem baru otomatis didaftarkan: <strong>{reconcileResult.created}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    &bull; Dilewati (tidak memiliki SN/MAC): <strong>{reconcileResult.skipped}</strong>
                  </p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalButton
              type="button"
              variant="secondary"
              onClick={() => setIsReconcileModalOpen(false)}
            >
              Tutup
            </ModalButton>
            <ModalButton
              type="button"
              variant="primary"
              onClick={handleRunReconciliation}
              disabled={reconciling}
            >
              {reconciling ? (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin mr-1.5 inline" />
                  Menjalankan Rekonsiliasi...
                </>
              ) : (
                'Jalankan Rekonsiliasi Sekarang'
              )}
            </ModalButton>
          </ModalFooter>
        </SimpleModal>
      </div>
    </div>
  );
}
