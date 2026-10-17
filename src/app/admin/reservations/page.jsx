'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ThemedLayout,
  ThemedCard,
  ThemedButton,
  ThemedInput,
  ThemedSelect,
  ThemedBadge
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { validatePhoneNumber, validateDrivingLicense } from '@/lib/validations';

export default function ReservationsPage() {
  const router = useRouter();

  // List state
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('reserved');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState({ hourlyRate: 80 });

  // Customer search / new customer
  const [customerMode, setCustomerMode] = useState('search'); // 'search' | 'new'
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    driverLicense: ''
  });

  const [form, setForm] = useState({
    preferredType: 'any',
    pickupTime: '',
    advanceAmount: 0,
    advancePaymentMethod: 'cash',
    notes: ''
  });

  // Debounce list search
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch settings (for default advance = hourly rate)
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSettings(data.settings);
          setForm(prev => ({
            ...prev,
            advanceAmount: data.settings.hourlyRate || 80
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchTerm
      });
      const res = await fetch(`/api/reservations?${params}`);
      const data = await res.json();
      if (data.success) {
        setReservations(data.reservations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Customer autocomplete
  useEffect(() => {
    if (customerMode !== 'search' || customerQuery.trim().length < 2) {
      setCustomerSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSearchingCustomers(true);
        const res = await fetch(
          `/api/customers/search?q=${encodeURIComponent(customerQuery)}&limit=8`
        );
        const data = await res.json();
        if (data.success) setCustomerSuggestions(data.customers || []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery, customerMode]);

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setCustomerSuggestions([]);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery('');
  };

  // Default pickup time = next round hour
  const getDefaultPickupTime = () => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:00`;
  };

  const openCreate = () => {
    setForm(prev => ({
      ...prev,
      pickupTime: getDefaultPickupTime(),
      advanceAmount: 0,
      preferredType: 'any',
      advancePaymentMethod: 'cash',
      notes: ''
    }));
    setCustomerMode('search');
    setSelectedCustomer(null);
    setCustomerQuery('');
    setNewCustomer({ name: '', phone: '', driverLicense: '' });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    // Validate
    if (customerMode === 'search' && !selectedCustomer) {
      alert('Please select a customer or switch to Add New Customer');
      return;
    }
    if (customerMode === 'new') {
      if (!newCustomer.name.trim()) {
        alert('Customer name is required');
        return;
      }
      if (!validatePhoneNumber(newCustomer.phone)) {
        alert('Valid 10-digit phone is required');
        return;
      }
      if (!validateDrivingLicense(newCustomer.driverLicense)) {
        alert('Valid driver license is required');
        return;
      }
    }
    if (!form.pickupTime) {
      alert('Pickup time is required');
      return;
    }
    if (!form.advancePaymentMethod) {
      alert('Advance payment method is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        preferredType: form.preferredType,
        pickupTime: new Date(form.pickupTime).toISOString(),
        advanceAmount: Number(form.advanceAmount) || settings.hourlyRate || 80,
        advancePaymentMethod: form.advancePaymentMethod,
        notes: form.notes,
        createdBy: 'staff'
      };

      if (customerMode === 'search') {
        payload.customerId = selectedCustomer._id;
      } else {
        payload.customer = {
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          driverLicense: newCustomer.driverLicense.trim().toUpperCase()
        };
      }

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to create reservation');
        return;
      }

      setShowCreate(false);
      fetchReservations();
      alert(`Reservation ${data.reservation.reservationId} created`);
    } catch (e) {
      console.error(e);
      alert('Error creating reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAction = async (id, action) => {
    const labels = {
      cancel: 'Cancel this reservation?',
      no_show: 'Mark as No-Show?'
    };
    if (!confirm(labels[action] || 'Confirm?')) return;

    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, cancelledBy: 'staff', noShowBy: 'staff' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Action failed');
        return;
      }
      fetchReservations();
    } catch (e) {
      console.error(e);
      alert('Error updating reservation');
    }
  };

  // Convert → open New Booking with prefill
  const handleConvert = (r) => {
    const params = new URLSearchParams({
      customerId: r.customerId?._id || r.customerId,
      reservationId: r._id,
      advance: String(r.advanceAmount || 0)
    });
    router.push(`/booking?${params.toString()}`);
  };

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const formatDateTime = (d) =>
    new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

  const statusBadge = (status) => {
    const map = {
      reserved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      converted: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      no_show: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return map[status] || map.reserved;
  };

  const preferredLabel = (t) => {
    if (t === 'scooty') return '🛵 Scooty';
    if (t === 'bike') return '🏍️ Bike';
    return 'Any';
  };

  return (
    <ThemedLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className={theme.typography.title}>Bike Reservations</h1>
            <p className="text-gray-400 mt-1">Same-day holds · Assign vehicle at pickup</p>
          </div>
          <ThemedButton variant="primary" onClick={openCreate}>
            + New Reservation
          </ThemedButton>
        </div>

        {/* Filters */}
        <ThemedCard className="mb-6">
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <ThemedInput
              label="Search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, phone, reservation ID..."
            />
            <ThemedSelect
              label="Status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'converted', label: 'Converted' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'no_show', label: 'No-Show' }
              ]}
            />
            <div className="flex items-end">
              <ThemedButton variant="secondary" onClick={fetchReservations} className="w-full">
                🔄 Refresh
              </ThemedButton>
            </div>
          </div>
        </ThemedCard>

        {/* List */}
        <ThemedCard title="Today's Reservations">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
              <span className="text-white">Loading...</span>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="text-xl text-white font-semibold mb-2">No reservations today</h3>
              <p className="text-gray-400 mb-6">Create one when a customer calls ahead</p>
              <ThemedButton variant="primary" onClick={openCreate}>
                + New Reservation
              </ThemedButton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-400">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Pickup</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Advance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {reservations.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-800/40">
                      <td className="py-4 px-4 font-mono text-cyan-400 text-sm">
                        {r.reservationId}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white font-medium">{r.customerName}</div>
                        <div className="text-gray-400 text-sm">{r.customerPhone}</div>
                      </td>
                      <td className="py-4 px-4 text-white font-semibold">
                        {formatTime(r.pickupTime)}
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {preferredLabel(r.preferredType)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-white font-medium">
                          ₹{Number(r.advanceAmount).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-gray-400 uppercase">
                          {r.advancePaymentMethod}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={cn(
                            'inline-block px-2 py-1 rounded text-xs font-semibold border',
                            statusBadge(r.status)
                          )}
                        >
                          {r.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-2">
                        {r.status === 'reserved' && (
  <>
    <a href={`tel:${r.customerPhone}`}>
      <ThemedButton variant="secondary" className="text-xs px-3 py-1">
        📞 Call
      </ThemedButton>
    </a>
    <ThemedButton
      variant="success"
      className="text-xs px-3 py-1"
      onClick={() => handleConvert(r)}
    >
      Start Rental
    </ThemedButton>
    <ThemedButton
      variant="secondary"
      className="text-xs px-3 py-1"
      onClick={() => handleStatusAction(r._id, 'no_show')}
    >
      No-Show
    </ThemedButton>
    <ThemedButton
      variant="secondary"
      className="text-xs px-3 py-1 text-red-400"
      onClick={() => handleStatusAction(r._id, 'cancel')}
    >
      Cancel
    </ThemedButton>
  </>
)}
                          {r.status === 'converted' && r.bookingId && (
                            <Link href={`/active-bookings/${r.bookingId.bookingId || r.bookingId}`}>
                              <ThemedButton variant="secondary" className="text-xs px-3 py-1">
                                View Booking
                              </ThemedButton>
                            </Link>
                          )}
                          {r.notes && (
                            <span className="text-xs text-gray-500 self-center" title={r.notes}>
                              📝
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ThemedCard>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <Link href="/booking">
            <ThemedButton variant="primary" className="w-full">➕ New Booking</ThemedButton>
          </Link>
          <Link href="/active-bookings">
            <ThemedButton variant="success" className="w-full">🔄 Active Rentals</ThemedButton>
          </Link>
          <Link href="/admin">
            <ThemedButton variant="secondary" className="w-full">📊 Dashboard</ThemedButton>
          </Link>
          <Link href="/customers">
            <ThemedButton variant="secondary" className="w-full">👥 Customers</ThemedButton>
          </Link>
        </div>
      </div>

      {/* ========== CREATE MODAL ========== */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">New Reservation</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer mode toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('search');
                    setSelectedCustomer(null);
                  }}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition',
                    customerMode === 'search'
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300'
                  )}
                >
                  Existing Customer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('new');
                    setSelectedCustomer(null);
                    setCustomerQuery('');
                  }}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition',
                    customerMode === 'new'
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300'
                  )}
                >
                  Add New Customer
                </button>
              </div>

              {customerMode === 'search' ? (
                <div className="relative">
                  <ThemedInput
                    label="Search Customer *"
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      if (selectedCustomer) clearSelectedCustomer();
                    }}
                    placeholder="Name or phone..."
                  />
                  {selectedCustomer && (
                    <div className="mt-2 flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                      <div>
                        <div className="text-green-300 font-medium">{selectedCustomer.name}</div>
                        <div className="text-sm text-gray-400">
                          {selectedCustomer.phone} · {selectedCustomer.driverLicense}
                        </div>
                      </div>
                      <button
                        onClick={clearSelectedCustomer}
                        className="text-red-400 text-sm underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  {searchingCustomers && (
                    <div className="text-sm text-gray-400 mt-1">Searching...</div>
                  )}
                  {!selectedCustomer && customerSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      {customerSuggestions.map((c) => (
                        <div
                          key={c._id}
                          onClick={() => selectCustomer(c)}
                          className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0"
                        >
                          <div className="text-white font-medium">{c.name}</div>
                          <div className="text-sm text-gray-400">
                            {c.phone} · {c.driverLicense}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <ThemedInput
                    label="Full Name *"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                    placeholder="Customer full name"
                  />
                  <ThemedInput
                    label="Phone *"
                    type="tel"
                    maxLength={10}
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                    placeholder="10-digit phone"
                    error={
                      newCustomer.phone && !validatePhoneNumber(newCustomer.phone)
                        ? 'Invalid phone'
                        : ''
                    }
                  />
                  <ThemedInput
                    label="Driver License *"
                    value={newCustomer.driverLicense}
                    onChange={(e) =>
                      setNewCustomer(p => ({
                        ...p,
                        driverLicense: e.target.value.toUpperCase()
                      }))
                    }
                    placeholder="e.g. MP1420110012345"
                    error={
                      newCustomer.driverLicense &&
                      !validateDrivingLicense(newCustomer.driverLicense)
                        ? 'Invalid license'
                        : ''
                    }
                  />
                </div>
              )}

              {/* Pickup time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pickup Time (Today) *
                </label>
                <input
                  type="datetime-local"
                  value={form.pickupTime}
                  onChange={(e) => setForm(p => ({ ...p, pickupTime: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              {/* Preferred type */}
              <ThemedSelect
                label="Preferred Type"
                value={form.preferredType}
                onValueChange={(v) => setForm(p => ({ ...p, preferredType: v }))}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'scooty', label: '🛵 Scooty' },
                  { value: 'bike', label: '🏍️ Bike' }
                ]}
              />

              {/* Advance */}
              <div className="grid grid-cols-2 gap-4">
                <ThemedInput
                  label="Advance Amount (₹)"
                  type="number"
                  min={0}
                  value={form.advanceAmount}
                  onChange={(e) => setForm(p => ({ ...p, advanceAmount: e.target.value }))}
                  placeholder={String(settings.hourlyRate || 80)}
                />
                <ThemedSelect
                  label="Payment Method"
                  value={form.advancePaymentMethod}
                  onValueChange={(v) => setForm(p => ({ ...p, advancePaymentMethod: v }))}
                  options={[
                    { value: 'cash', label: '💵 Cash' },
                    { value: 'upi', label: '📱 UPI' }
                  ]}
                />
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Default = first hour rate (₹{settings.hourlyRate || 80})
              </p>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes..."
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-400 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-700 flex gap-3">
              <ThemedButton
                variant="secondary"
                className="flex-1"
                onClick={() => setShowCreate(false)}
                disabled={submitting}
              >
                Cancel
              </ThemedButton>
              <ThemedButton
                variant="primary"
                className="flex-1"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Reservation'}
              </ThemedButton>
            </div>
          </div>
        </div>
      )}
    </ThemedLayout>
  );
}