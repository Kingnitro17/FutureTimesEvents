'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, Calendar, User, Camera, Upload, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useEvents } from '@/lib/useEvents';
import toast from 'react-hot-toast';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: 'easeOut' as const },
});

export default function ProfilePage() {
  const { user, isLoading, profileError, retryProfile } = useAuth();
  const { events } = useEvents();
  const [activeTab, setActiveTab] = useState<'saved' | 'badges'>('saved');
  const [avatar, setAvatar]       = useState<string>(user?.avatar || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Loading / unauthenticated ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-nav">
        <div className="text-center space-y-4 px-6">
          <p className="text-4xl">👤</p>
          <h2 className="type-h2 text-[var(--text)]">Sign in to view your profile</h2>
          <Link href="/login" className="btn btn-lg btn-grad text-white">Sign In</Link>
        </div>
      </div>
    );
  }

  // ── Loyalty helpers ────────────────────────────────────────────────
  const loyaltyPoints = user.loyaltyPoints ?? 0;
  const loyaltyLevel  = loyaltyPoints >= 3000 ? 'Platinum' : loyaltyPoints >= 1500 ? 'Gold' : 'Silver';
  const loyaltyColor  = loyaltyLevel === 'Platinum' ? '#DD1FFF' : loyaltyLevel === 'Gold' ? '#FFBC73' : '#2CC4EA';
  const nextLevel     = loyaltyLevel === 'Silver' ? 1500 : loyaltyLevel === 'Gold' ? 3000 : 5000;
  void nextLevel;
  const earnedBadges  = (user.badges ?? []).filter(b => b.earned).length;
  const displayedAvatar = avatar || user.avatar || '';

  // ── Avatar upload ──────────────────────────────────────────────────
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['jpg', 'jpeg', 'png', 'webp'].includes(extension) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(file.type.includes('heic') ? 'HEIC is not supported yet. Choose a JPG, PNG or WebP image.' : 'Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024)    { toast.error('Image must be less than 5MB');  return; }

    const previousAvatar = displayedAvatar;
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl);
    setIsUploading(true);
    try {
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: false, contentType: file.type, cacheControl: '31536000' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
      if (updateError) {
        await supabase.storage.from('avatars').remove([path]);
        throw updateError;
      }
      setAvatar(avatarUrl);
      toast.success('Profile picture updated!');
    } catch (error) {
      setAvatar(previousAvatar);
      if (process.env.NODE_ENV === 'development') console.error('[Profile] Avatar upload failed:', error);
      toast.error('We could not upload that photo. Please try again.');
    } finally {
      URL.revokeObjectURL(previewUrl);
      e.target.value = '';
      setIsUploading(false);
    }
  };

  const tabs: { id: 'saved' | 'badges'; label: string }[] = [
    { id: 'saved',  label: '❤️ Saved'  },
    { id: 'badges', label: '🏅 Badges' },
  ];

  // Use 3 random events from live data as "saved" placeholder until saved table exists
  const savedEvents = events.slice(0, 4);

  return (
    <div className="min-h-screen page-offset pb-nav" style={{ background: 'var(--bg-secondary)' }}>

      {/* ── Cover banner ── */}
      <div className="container flex flex-col gap-10 pt-6 sm:pt-8">
        {/* ── Profile card ── */}
        <div>
          <motion.div {...fadeUp(0.05)} className="card rounded-2xl p-5 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">

              {/* Avatar */}
              <div className="relative shrink-0">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white flex items-center justify-center shadow-lg overflow-hidden cursor-pointer group"
                  style={{ background: displayedAvatar ? 'transparent' : 'linear-gradient(135deg,#FF55C2,#7222E3)' }}
                  onClick={handleAvatarClick}
                >
                  {displayedAvatar
                    ? <img src={displayedAvatar} alt={user.name} className="w-full h-full object-cover" />
                    : <User size={36} className="text-white" />}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploading
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Camera size={20} className="text-white" />}
                  </div>
                </motion.div>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  aria-label="Upload profile picture"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                >
                  <Upload size={14} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="type-h2 text-[var(--text)]">{user.name}</h1>
                  {user.isVip && <span className="badge badge-grad">👑 VIP</span>}
                  <span className="badge" style={{ background: `linear-gradient(135deg,${loyaltyColor},#533885)`, color: '#fff' }}>
                    {loyaltyLevel}
                  </span>
                </div>
                {user.bio && (
                  <p className="type-sm text-[var(--text-muted)] mb-2 line-clamp-2">{user.bio}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                  {user.location && (
                    <span className="flex items-center gap-1"><MapPin size={11} />{user.location}</span>
                  )}
                  {user.joinedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Joined {new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>

              <Link href="/settings" className="btn btn-sm btn-ghost shrink-0 self-start sm:self-auto">
                Edit Profile
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ── Stats row ── */}
        {profileError && (
          <div className="card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3" role="status">
            <p className="text-sm text-[var(--text-muted)] flex-1">{profileError}</p>
            <button className="btn btn-sm btn-ghost" onClick={() => void retryProfile()}>
              <RefreshCw size={14} /> Retry profile
            </button>
          </div>
        )}

        <motion.div {...fadeUp(0.1)} className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { icon: '🎟️', val: user.eventsAttended ?? 0,                             label: 'Events Attended' },
            { icon: '💰', val: `$${(user.totalSpent ?? 0).toLocaleString()}`,        label: 'Total Spent'    },
            { icon: '⭐', val: loyaltyPoints.toLocaleString(),                        label: 'Loyalty Pts'   },
            { icon: '🏅', val: earnedBadges,                                          label: 'Badges'        },
          ].map(({ icon, val, label }) => (
            <div key={label} className="card rounded-2xl p-4 sm:p-5 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="type-h3 text-[var(--text)] mb-0.5">{val}</div>
              <div className="type-caption text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </motion.div>



        {/* ── Tabs ── */}
        <motion.div {...fadeUp(0.2)} className="flex gap-4">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`btn btn-sm transition-all ${activeTab === tab.id ? 'btn-grad text-white' : 'btn-ghost'}`}>
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* ── Saved events ── */}
        {activeTab === 'saved' && (
          <div className="grid sm:grid-cols-2 gap-6">
            {savedEvents.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-[var(--text-muted)]">
                <p className="text-3xl mb-3">🔖</p>
                <p className="font-semibold">No saved events yet</p>
                <Link href="/events" className="btn btn-sm btn-grad text-white mt-4">Browse Events</Link>
              </div>
            ) : savedEvents.map((ev, i) => (
              <motion.div key={ev.id} {...fadeUp(i * 0.06)}>
                <Link href={`/events/${ev.slug}`}
                  className="card rounded-xl overflow-hidden flex gap-3 p-3 hover:border-[var(--border-hover)] transition-all group">
                  {ev.image ? (
                    <img src={ev.image} alt={ev.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center text-2xl"
                      style={{ background: 'var(--bg-tertiary)' }}>🎉</div>
                  )}
                  <div className="min-w-0 py-0.5">
                    <p className="text-base font-black text-[var(--text)] line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
                      {ev.title}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-1">{ev.venue}</p>
                    <p className="text-sm font-black grad-text mt-2">{ev.priceLabel}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Badges ── */}
        {activeTab === 'badges' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {(user.badges ?? []).length === 0 ? (
              <div className="col-span-2 text-center py-12 text-[var(--text-muted)]">
                <p className="text-3xl mb-3">🏅</p>
                <p className="font-semibold">No badges yet — start attending events!</p>
              </div>
            ) : (user.badges ?? []).map((b, i) => (
              <motion.div key={b.id} {...fadeUp(i * 0.06)}
                className={`card rounded-2xl p-5 text-center transition-all ${b.earned ? 'border-purple-200' : 'border-[var(--border)] opacity-50'}`}>
                <div className={`text-3xl mb-3 ${!b.earned ? 'grayscale opacity-40' : ''}`}>{b.icon}</div>
                <p className="text-sm font-semibold text-[var(--text)] mb-1">{b.name}</p>
                <p className="type-caption text-[var(--text-muted)]">{b.description}</p>
                {b.earned && b.earnedAt && (
                  <p className="type-caption mt-2 grad-text font-semibold">
                    Earned {new Date(b.earnedAt).toLocaleDateString()}
                  </p>
                )}
                {!b.earned && <p className="type-caption mt-2 text-[var(--text-muted)]">Not yet earned</p>}
              </motion.div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
