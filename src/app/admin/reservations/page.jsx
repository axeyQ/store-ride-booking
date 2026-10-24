'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ThemedLayout,
  ThemedCard,
  ThemedButton,
  ThemedInput,
  ThemedSelect
} from '@/components/themed';
import { theme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { validatePhoneNumber, validateDrivingLicense } from '@/lib/validations';

export default function EnquiriesPage() {
  const router = useRouter();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('reserved');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState({ hourlyRate: 80 });

  const [customerMode, setCustomerMode] = useState('search');
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
    urgency: 'now',
    preferredTime: '',
    isPriority: false,
    notes: ''
  });

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSettings(data.settings);
      })
      .catch(() => {});
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchTerm
      });
      const res = await fetch(`/api/reservations?${params}`);
      const data = await res.json();
      if (data.success) setReservations(data.reservations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

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

  const getDefaultLaterTime = () => {
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
    setForm({
      preferredType: 'any',
      urgency: 'now',
      preferredTime: getDefaultLaterTime(),
      isPriority: false,
      notes: ''
    });
    setCustomerMode('search');
    setSelectedCustomer(null);
    setCustomerQuery('');
    setNewCustomer({ name: '', phone: '', driverLicense: '' });
    setShowCreate(true);
  };

  const handleCreate = async () => {
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
    if (form.urgency === 'later' && !form.preferredTime) {
      alert('Preferred time is required when they want it later');
      return;
    }
  
    setSubmitting(true);
    try {
      const payload = {
        preferredType: form.preferredType,
        urgency: form.urgency,
        isPriority: Boolean(form.isPriority),
        notes: form.notes,
        createdBy: 'staff'
      };
  
      if (form.urgency === 'later') {
        payload.preferredTime = new Date(form.preferredTime).toISOString();
        payload.pickupTime = new Date(form.preferredTime).toISOString();
      } else {
        payload.pickupTime = new Date().toISOString();
      }
  
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
        alert(data.error || 'Failed to create enquiry');
        return;
      }
  
      setShowCreate(false);
      fetchReservations();
      alert(`Enquiry ${data.reservation.reservationId} created`);
    } catch (e) {
      console.error(e);
      alert('Error creating enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAction = async (id, action) => {
    const labels = {
      cancel: 'Cancel this enquiry?',
      no_show: 'Mark as No-Show / no answer?'
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
      alert('Error updating enquiry');
    }
  };

  const togglePriority = async (r) => {
    if (r.status !== 'reserved') return;
    try {
      const res = await fetch(`/api/reservations/${r._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPriority: !r.isPriority })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Could not update priority');
        return;
      }
      fetchReservations();
    } catch (e) {
      console.error(e);
    }
  };

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

  const statusLabel = (status) => {
    const map = {
      reserved: 'Waiting',
      converted: 'Got vehicle',
      cancelled: 'Cancelled',
      no_show: 'No answer'
    };
    return map[status] || status;
  };

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

  const urgencyLabel = (r) => {
    if (r.urgency === 'later') {
      const t = r.preferredTime || r.pickupTime;
      return t ? `Later · ${formatTime(t)}` : 'Later';
    }
    return 'Need now';
  };

  const ActionButtons = ({ r }) => (
    <>
      {r.status === 'reserved' && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full">
          <a href={`tel:${r.customerPhone}`} className="flex-1 sm:flex-initial">
            <ThemedButton variant="secondary" className="w-full sm:w-auto text-sm min-h-11 px-3">
              📞 Call
            </ThemedButton>
          </a>
          <ThemedButton
            variant="success"
            className="flex-1 sm:flex-initial text-sm min-h-11 px-3"
            onClick={() => handleConvert(r)}
          >
            Start Rental
          </ThemedButton>
          <ThemedButton
            variant="secondary"
            className="flex-1 sm:flex-initial text-sm min-h-11 px-3"
            onClick={() => handleStatusAction(r._id, 'no_show')}
          >
            No answer
          </ThemedButton>
          <ThemedButton
            variant="secondary"
            className="flex-1 sm:flex-initial text-sm min-h-11 px-3 text-red-400"
            onClick={() => handleStatusAction(r._id, 'cancel')}
          >
            Cancel
          </ThemedButton>
        </div>
      )}
      {r.status === 'converted' && r.bookingId && (
        <Link
          href={`/active-bookings/${r.bookingId.bookingId || r.bookingId}`}
          className="w-full sm:w-auto"
        >
          <ThemedButton variant="secondary" className="w-full text-sm min-h-11 px-3">
            View Booking
          </ThemedButton>
        </Link>
      )}
    </>
  );

  return (
    <ThemedLayout>
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className={theme.typography.title}>Enquiries</h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              Waiting list when vehicles are out · FIFO queue
            </p>
          </div>
          <ThemedButton variant="primary" onClick={openCreate} className="w-full sm:w-auto min-h-11">
            + New Enquiry
          </ThemedButton>
        </div>

        {/* Filters */}
        <ThemedCard className="mb-4 sm:mb-6">
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <ThemedInput
              label="Search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, phone, ID..."
            />
            <ThemedSelect
              label="Status"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'reserved', label: 'Waiting' },
                { value: 'converted', label: 'Got vehicle' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'no_show', label: 'No answer' }
              ]}
            />
            <div className="flex items-end">
              <ThemedButton
                variant="secondary"
                onClick={fetchReservations}
                className="w-full min-h-11"
              >
                🔄 Refresh
              </ThemedButton>
            </div>
          </div>
        </ThemedCard>

        {/* List */}
        <ThemedCard title="Today's queue">
          {loading ? (
            <div className="flex items-center justify-center py-12 sm:py-16 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
              <span className="text-white">Loading...</span>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 sm:py-16 px-4">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg sm:text-xl text-white font-semibold mb-2">
                No enquiries in queue
              </h3>
              <p className="text-gray-400 mb-6 text-sm sm:text-base">
                Add one when someone calls or walks in and nothing is free
              </p>
              <ThemedButton variant="primary" onClick={openCreate} className="min-h-11">
                + New Enquiry
              </ThemedButton>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-3">
                {reservations.map((r, index) => (
                  <div
                    key={r._id}
                    className={cn(
                      'rounded-xl border p-4 space-y-3',
                      r.isPriority
                        ? 'border-amber-500/40 bg-amber-900/10'
                        : 'border-gray-700 bg-gray-800/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold truncate">
                            {r.customerName}
                          </span>
                          {r.isPriority && (
                            <span className="text-amber-400 text-xs font-medium">★ Priority</span>
                          )}
                        </div>
                        <a
                          href={`tel:${r.customerPhone}`}
                          className="text-cyan-300 text-sm underline"
                        >
                          {r.customerPhone}
                        </a>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          {r.reservationId}
                          {statusFilter === 'reserved' && (
                            <span className="ml-2 text-gray-400">#{index + 1} in queue</span>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 inline-block px-2 py-1 rounded text-xs font-semibold border',
                          statusBadge(r.status)
                        )}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-500 text-xs">Urgency</div>
                        <div className="text-white">{urgencyLabel(r)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs">Type</div>
                        <div className="text-gray-200">{preferredLabel(r.preferredType)}</div>
                      </div>
                      {Number(r.advanceAmount) > 0 && (
                        <div>
                          <div className="text-gray-500 text-xs">Advance</div>
                          <div className="text-white">
                            ₹{Number(r.advanceAmount).toLocaleString('en-IN')}
                            {r.advancePaymentMethod && (
                              <span className="text-gray-400 text-xs ml-1 uppercase">
                                {r.advancePaymentMethod}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {r.notes && (
                      <p className="text-xs text-gray-400 border-t border-gray-700 pt-2">
                        📝 {r.notes}
                      </p>
                    )}

                    {r.status === 'reserved' && (
                      <button
                        type="button"
                        onClick={() => togglePriority(r)}
                        className="text-xs text-amber-400/90 underline"
                      >
                        {r.isPriority ? 'Remove priority' : 'Mark priority (frequent)'}
                      </button>
                    )}

                    <ActionButtons r={r} />
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-gray-400 text-sm">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {reservations.map((r, index) => (
                      <tr
                        key={r._id}
                        className={cn(
                          'hover:bg-gray-800/40',
                          r.isPriority && 'bg-amber-900/10'
                        )}
                      >
                        <td className="py-4 px-4 text-gray-500 text-sm">
                          {statusFilter === 'reserved' ? index + 1 : '—'}
                          {r.isPriority && (
                            <span className="block text-amber-400 text-xs">★</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-white font-medium flex items-center gap-2">
                            {r.customerName}
                            {r.status === 'reserved' && (
                              <button
                                type="button"
                                onClick={() => togglePriority(r)}
                                className="text-amber-400/80 hover:text-amber-300 text-xs"
                                title="Toggle priority"
                              >
                                {r.isPriority ? '★' : '☆'}
                              </button>
                            )}
                          </div>
                          <a
                            href={`tel:${r.customerPhone}`}
                            className="text-cyan-300 text-sm underline"
                          >
                            {r.customerPhone}
                          </a>
                          <div className="text-xs text-gray-500 font-mono">
                            {r.reservationId}
                          </div>
                          {r.notes && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={r.notes}>
                              📝 {r.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-white text-sm">{urgencyLabel(r)}</td>
                        <td className="py-4 px-4 text-gray-300 text-sm">
                          {preferredLabel(r.preferredType)}
                          {Number(r.advanceAmount) > 0 && (
                            <div className="text-xs text-gray-500">
                              Adv ₹{Number(r.advanceAmount).toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              'inline-block px-2 py-1 rounded text-xs font-semibold border',
                              statusBadge(r.status)
                            )}
                          >
                            {statusLabel(r.status)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-2">
                            <ActionButtons r={r} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </ThemedCard>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-6 sm:mt-8">
          <Link href="/booking">
            <ThemedButton variant="primary" className="w-full min-h-11 text-sm">
              ➕ New Booking
            </ThemedButton>
          </Link>
          <Link href="/active-bookings">
            <ThemedButton variant="success" className="w-full min-h-11 text-sm">
              🔄 Active Rentals
            </ThemedButton>
          </Link>
          <Link href="/">
            <ThemedButton variant="secondary" className="w-full min-h-11 text-sm">
              🏠 Home
            </ThemedButton>
          </Link>
          <Link href="/customers">
            <ThemedButton variant="secondary" className="w-full min-h-11 text-sm">
              👥 Customers
            </ThemedButton>
          </Link>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
              <h2 className="text-lg sm:text-xl font-bold text-white">New Enquiry</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none w-10 h-10"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('search');
                    setSelectedCustomer(null);
                  }}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium border transition min-h-11',
                    customerMode === 'search'
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300'
                  )}
                >
                  Existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('new');
                    setSelectedCustomer(null);
                    setCustomerQuery('');
                  }}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium border transition min-h-11',
                    customerMode === 'new'
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300'
                  )}
                >
                  New customer
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
                      <div className="min-w-0">
                        <div className="text-green-300 font-medium truncate">
                          {selectedCustomer.name}
                        </div>
                        <div className="text-sm text-gray-400">
                          {selectedCustomer.phone} · {selectedCustomer.driverLicense}
                        </div>
                      </div>
                      <button
                        onClick={clearSelectedCustomer}
                        className="text-red-400 text-sm underline shrink-0 ml-2"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                  {searchingCustomers && (
                    <div className="text-sm text-gray-400 mt-1">Searching...</div>
                  )}
                  {!selectedCustomer && customerSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
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
                    onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Customer full name"
                  />
                  <ThemedInput
                    label="Phone *"
                    type="tel"
                    maxLength={10}
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
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
                      setNewCustomer((p) => ({
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

              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Urgency *</label>
                <div className="flex gap-2">
                  {[
                    { id: 'now', label: 'Need now' },
                    { id: 'later', label: 'Can wait / later' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, urgency: opt.id }))}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg text-sm font-medium border transition min-h-11',
                        form.urgency === opt.id
                          ? 'bg-cyan-600 border-cyan-500 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.urgency === 'later' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preferred time (today) *
                  </label>
                  <input
                    type="datetime-local"
                    value={form.preferredTime}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, preferredTime: e.target.value }))
                    }
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-400 min-h-11"
                  />
                </div>
              )}

              <ThemedSelect
                label="Preferred type"
                value={form.preferredType}
                onValueChange={(v) => setForm((p) => ({ ...p, preferredType: v }))}
                options={[
                  { value: 'any', label: 'Any' },
                  { value: 'scooty', label: '🛵 Scooty' },
                  { value: 'bike', label: '🏍️ Bike' }
                ]}
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPriority}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, isPriority: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-gray-500 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-white text-sm">
                  ★ Priority (frequent customer — show higher in queue)
                </span>
              </label>



              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (e.g. needs 2 scooties)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional..."
                  className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-cyan-400 resize-none"
                />
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-700 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sticky bottom-0 bg-gray-900">
              <ThemedButton
                variant="secondary"
                className="flex-1 min-h-11"
                onClick={() => setShowCreate(false)}
                disabled={submitting}
              >
                Close
              </ThemedButton>
              <ThemedButton
                variant="primary"
                className="flex-1 min-h-11"
                onClick={handleCreate}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Add to queue'}
              </ThemedButton>
            </div>
          </div>
        </div>
      )}
    </ThemedLayout>
  );
}
