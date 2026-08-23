import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from 'react-router-dom';

import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

import {
  Ticket as TicketIcon,
  User as UserIcon,
  LogOut,
  Smartphone,
  ShieldCheck,
  LayoutDashboard,
  Menu,
  X,
  ChevronRight,
  AlertCircle,
  Handshake,
  Megaphone,
  Trophy,
} from 'lucide-react';

import { cn } from './lib/utils';

import { UserProfile, Event as EventType } from './types';

// Main Components
import Home from './components/Home';
import EventDetails from './components/EventDetails';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import OrganizerDashboard from './components/OrganizerDashboard';
import OrganizerWallet from './components/OrganizerWallet';
import Sponsors from './components/Sponsors';
import Advertise from './components/Advertise';
import Competitions from './components/Competitions';

// Ticket Verification
import TicketVerify from './components/TicketVerify';

// Scanner Components
import OrganizerScannerLoginScreen from './components/scanner/OrganizerScannerLoginScreen';
import SelectGateScreen from './components/scanner/SelectGateScreen';
import SelectActiveEventScreen from './components/scanner/SelectActiveEventScreen';
import ScannerScreen from './components/scanner/ScannerScreen';


// ============================================================
// ERROR BOUNDARY
// ============================================================

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(
    error: Error
  ): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(
    error: Error,
    errorInfo: React.ErrorInfo
  ) {
    console.error('Application error:', error);
    console.error('React error info:', errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;

    if (hasError) {
      const errorMessage =
        error?.message || 'Something went wrong.';

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={32} />
            </div>

            <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
              Application Error
            </h1>

            <p className="text-white/60 text-sm leading-relaxed break-words">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full bg-white text-black py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


// ============================================================
// APP
// ============================================================

export default function App() {
  // ==========================================================
  // USER STATE
  // ==========================================================

  const [user, setUser] =
    useState<UserProfile | null>(null);

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);


  // ==========================================================
  // AUTH MODAL STATE
  // ==========================================================

  const [showAuthModal, setShowAuthModal] =
    useState(false);

  const [pendingPlan, setPendingPlan] =
    useState<string | null>(null);

  const [authMode, setAuthMode] =
    useState<'login' | 'register'>('login');

  const [authRole, setAuthRole] =
    useState<'Customer' | 'Organizer'>(
      'Customer'
    );

  const [authName, setAuthName] =
    useState('');

  const [authIdentifier, setAuthIdentifier] =
    useState('');

  const [authPassword, setAuthPassword] =
    useState('');

  const [authPhone, setAuthPhone] =
    useState('');

  const [authSubmitting, setAuthSubmitting] =
    useState(false);

  const [registrationStep, setRegistrationStep] =
    useState<'role' | 'form'>('role');


  // ==========================================================
  // SCANNER STATE
  // ==========================================================

  const [selectedGate, setSelectedGate] =
    useState<string>('');

  const [selectedEvent, setSelectedEvent] =
    useState<EventType | null>(null);


  // ==========================================================
  // HELPERS
  // ==========================================================

  const normalizeUser = (
    backendUser: any
  ): UserProfile => {
    if (!backendUser) {
      throw new Error(
        'The server did not return a user.'
      );
    }

    return {
      ...backendUser,
      uid:
        backendUser.uid ||
        backendUser.id ||
        '',
    } as UserProfile;
  };


  const parseApiResponse = async (
    response: Response
  ): Promise<any> => {
    const contentType =
      response.headers.get('content-type') || '';

    if (
      contentType.includes(
        'application/json'
      )
    ) {
      try {
        return await response.json();
      } catch {
        return {};
      }
    }

    const text = await response.text();

    return {
      error:
        text ||
        `Server returned ${response.status}`,
    };
  };


  const resetAuthForm = () => {
    setAuthName('');
    setAuthIdentifier('');
    setAuthPassword('');
    setAuthPhone('');
    setRegistrationStep('role');
    setAuthRole('Customer');
  };


  const closeAuthModal = () => {
    if (authSubmitting) {
      return;
    }

    setShowAuthModal(false);
    setAuthMode('login');
    resetAuthForm();
  };


  // ==========================================================
  // LOGIN
  // ==========================================================

  const handleLogin = async (
    identifier: string,
    password: string
  ) => {
    try {
      const cleanIdentifier =
        identifier.trim();

      if (!cleanIdentifier) {
        throw new Error(
          'Please enter your email or phone number.'
        );
      }

      if (!password) {
        throw new Error(
          'Please enter your password.'
        );
      }

      const res = await fetch(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            identifier:
              cleanIdentifier,
            password,
          }),
        }
      );

      const data =
        await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Login failed (${res.status})`
        );
      }

      const loggedInUser =
        normalizeUser(data?.user);

      console.log(
        'LOGGED IN USER:',
        loggedInUser
      );

      setUser(loggedInUser);

      setShowAuthModal(false);

      setPendingPlan(null);

      setAuthMode('login');

      resetAuthForm();

      toast.success(
        `Welcome back, ${
          loggedInUser.name || 'User'
        }!`
      );
    } catch (err: unknown) {
      console.error(
        'Login error:',
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : 'Unable to sign in';

      toast.error(message);

      throw err;
    }
  };


  // ==========================================================
  // LOGOUT
  // ==========================================================

const handleLogout = async () => {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error('Logout failed');
    }
  } catch (error) {
    console.error('Logout request failed:', error);
  } finally {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');

    window.location.href = '/';
  }
};


  // ==========================================================
  // REGISTRATION
  // ==========================================================

  const handleRegistration = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const name =
      authName.trim();

    const email =
      authIdentifier.trim();

    const phone =
      authPhone.trim();

    if (!name) {
      toast.error(
        'Please enter your name.'
      );
      return;
    }

    if (!email) {
      toast.error(
        'Please enter your email.'
      );
      return;
    }

    if (!authPassword) {
      toast.error(
        'Please enter a password.'
      );
      return;
    }

    if (authPassword.length < 6) {
      toast.error(
        'Password must be at least 6 characters.'
      );
      return;
    }

    setAuthSubmitting(true);

    try {
      const res = await fetch(
        '/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name,
            email,
            phone: phone || null,
            password: authPassword,
            role: authRole,
          }),
        }
      );

      const data =
        await parseApiResponse(res);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Registration failed (${res.status})`
        );
      }

      if (data?.user) {
        const registeredUser =
          normalizeUser(data.user);

        setUser(registeredUser);

        setShowAuthModal(false);

        toast.success(
          'Account created successfully!'
        );
      } else {
        setAuthMode('login');
        setRegistrationStep(
          'role'
        );

        toast.success(
          'Account created successfully. Please sign in.'
        );
      }

      setPendingPlan(null);

      resetAuthForm();
    } catch (err: unknown) {
      console.error(
        'Registration error:',
        err
      );

      toast.error(
        err instanceof Error
          ? err.message
          : 'Unable to create account'
      );
    } finally {
      setAuthSubmitting(false);
    }
  };


  // ==========================================================
  // APPLICATION
  // ==========================================================

  return (
    <ErrorBoundary>
      <Router>

        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500 selection:text-white">

          {/* ==================================================
              TOASTER
          ================================================== */}

          <Toaster
            position="top-center"
            richColors
          />


          {/* ==================================================
              MOCK MODE BANNER
          ================================================== */}

          <div className="bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1 text-center sticky top-0 z-[60]">
            MOCK MODE ACTIVE • NO FIREBASE CONNECTION REQUIRED
          </div>


          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <nav className="fixed top-6 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10">

            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

              {/* LOGO */}

              <Link
                to="/"
                className="text-xl font-black tracking-tighter flex items-center gap-2"
                onClick={() =>
                  setIsMenuOpen(false)
                }
              >
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <TicketIcon size={18} />
                </div>

                SWIFT
              </Link>


              {/* DESKTOP MENU */}

              <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">

                <Link
                  to="/"
                  className="hover:text-white transition-colors"
                >
                  Events
                </Link>

                <Link
                  to="/competitions"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <Trophy size={14} />
                  Competitions
                </Link>

                <Link
                  to="/advertise"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <Megaphone size={14} />
                  Advertise
                </Link>

                <Link
                  to="/sponsors"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <Handshake size={14} />
                  Sponsors
                </Link>


                {user?.role ===
                  'Organizer' && (
                  <>
                    <Link
                      to="/organizer"
                      className="hover:text-white transition-colors flex items-center gap-1 text-orange-400"
                    >
                      <LayoutDashboard
                        size={14}
                      />
                      Organizer
                    </Link>

                    <Link
                      to="/scanner"
                      className="hover:text-white transition-colors flex items-center gap-1 text-orange-400"
                    >
                      <Smartphone
                        size={14}
                      />
                      Scanner
                    </Link>
                  </>
                )}


                {user?.role ===
                  'Admin' && (
                  <Link
                    to="/admin"
                    className="hover:text-white transition-colors flex items-center gap-1 text-orange-400"
                  >
                    <ShieldCheck
                      size={14}
                    />
                    Admin
                  </Link>
                )}

              </div>


              {/* RIGHT SIDE */}

              <div className="flex items-center gap-4">

                {user ? (

                  <div className="flex items-center gap-4">

                    <div className="hidden lg:block text-right">

                      <p className="text-xs font-black uppercase tracking-widest text-white/40 leading-none mb-1">
                        Signed in as
                      </p>

                      <p className="text-sm font-bold text-orange-500 leading-none">
                        {user.name ||
                          'User'}
                      </p>

                    </div>


                    <Link
                      to="/profile"
                      onClick={() =>
                        setIsMenuOpen(false)
                      }
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                      <UserIcon size={20} />
                    </Link>


                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="hidden md:flex items-center gap-2 text-sm text-white/60 hover:text-white"
                    >
                      <LogOut size={16} />
                      Logout
                    </button>

                  </div>

                ) : (

                  <div className="flex items-center gap-3">

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(
                          'login'
                        );
                        setShowAuthModal(
                          true
                        );
                      }}
                      className="text-sm font-bold uppercase tracking-widest hover:text-orange-500 transition-colors"
                    >
                      Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(
                          'register'
                        );
                        setRegistrationStep(
                          'role'
                        );
                        setShowAuthModal(
                          true
                        );
                      }}
                      className="bg-orange-600 px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all"
                    >
                      Register
                    </button>

                  </div>

                )}


                <button
                  type="button"
                  aria-label={
                    isMenuOpen
                      ? 'Close menu'
                      : 'Open menu'
                  }
                  onClick={() =>
                    setIsMenuOpen(
                      !isMenuOpen
                    )
                  }
                  className="md:hidden p-2"
                >
                  {isMenuOpen ? (
                    <X />
                  ) : (
                    <Menu />
                  )}
                </button>

              </div>

            </div>


            {/* MOBILE MENU */}

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{
                    opacity: 0,
                    height: 0,
                  }}
                  animate={{
                    opacity: 1,
                    height: 'auto',
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                  }}
                  className="md:hidden border-t border-white/10 bg-[#0a0a0a]"
                >

                  <div className="px-4 py-6 space-y-3">

                    <Link
                      to="/"
                      onClick={() =>
                        setIsMenuOpen(false)
                      }
                      className="block py-3 text-white/70 hover:text-white font-bold"
                    >
                      Events
                    </Link>

                    <Link
                      to="/competitions"
                      onClick={() =>
                        setIsMenuOpen(false)
                      }
                      className="block py-3 text-white/70 hover:text-white font-bold"
                    >
                      Competitions
                    </Link>

                    <Link
                      to="/advertise"
                      onClick={() =>
                        setIsMenuOpen(false)
                      }
                      className="block py-3 text-white/70 hover:text-white font-bold"
                    >
                      Advertise
                    </Link>

                    <Link
                      to="/sponsors"
                      onClick={() =>
                        setIsMenuOpen(false)
                      }
                      className="block py-3 text-white/70 hover:text-white font-bold"
                    >
                      Sponsors
                    </Link>

                    <Link
                      to="/verify-ticket"
                      onClick={() =>
                        setIsMenuOpen(false)
                      }
                      className="block py-3 text-orange-400 hover:text-orange-300 font-bold"
                    >
                      Verify Ticket
                    </Link>


                    {user?.role ===
                      'Organizer' && (
                      <>
                        <Link
                          to="/organizer"
                          onClick={() =>
                            setIsMenuOpen(
                              false
                            )
                          }
                          className="block py-3 text-orange-400 font-bold"
                        >
                          Organizer Dashboard
                        </Link>

                        <Link
                          to="/scanner"
                          onClick={() =>
                            setIsMenuOpen(
                              false
                            )
                          }
                          className="block py-3 text-orange-400 font-bold"
                        >
                          Scanner
                        </Link>
                      </>
                    )}


                    {user?.role ===
                      'Admin' && (
                      <Link
                        to="/admin"
                        onClick={() =>
                          setIsMenuOpen(
                            false
                          )
                        }
                        className="block py-3 text-orange-400 font-bold"
                      >
                        Admin
                      </Link>
                    )}


                    {user && (
                      <>
                        <Link
                          to="/profile"
                          onClick={() =>
                            setIsMenuOpen(
                              false
                            )
                          }
                          className="block py-3 text-white/70 hover:text-white font-bold"
                        >
                          Profile
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(
                              false
                            );

                            void handleLogout();
                          }}
                          className="block w-full text-left py-3 text-white/70 hover:text-white font-bold"
                        >
                          Logout
                        </button>
                      </>
                    )}

                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </nav>


          {/* ==================================================
              AUTH MODAL
          ================================================== */}

          <AnimatePresence>

            {showAuthModal && (

              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

                <motion.div
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  onClick={
                    closeAuthModal
                  }
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />


                <motion.div
                  initial={{
                    scale: 0.9,
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    scale: 0.9,
                    opacity: 0,
                    y: 20,
                  }}
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
                >

                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-red-600" />


                  <button
                    type="button"
                    onClick={
                      closeAuthModal
                    }
                    disabled={
                      authSubmitting
                    }
                    className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors disabled:opacity-30"
                    aria-label="Close authentication modal"
                  >
                    <X size={24} />
                  </button>


                  <div className="text-center mb-8 pr-6">

                    <h2 className="text-3xl font-black uppercase tracking-tighter mb-2">
                      Welcome to Swift
                    </h2>

                    <p className="text-white/40 text-sm">
                      {authMode ===
                      'register'
                        ? `Create your ${authRole.toLowerCase()} account`
                        : 'Sign in to your Swift account'}
                    </p>

                  </div>


                  {/* LOGIN */}

                  {authMode ===
                    'login' && (

                    <form
                      onSubmit={async (
                        e
                      ) => {
                        e.preventDefault();

                        if (
                          !authIdentifier.trim() ||
                          !authPassword
                        ) {
                          toast.error(
                            'Please enter your email/phone and password'
                          );

                          return;
                        }

                        setAuthSubmitting(
                          true
                        );

                        try {
                          await handleLogin(
                            authIdentifier,
                            authPassword
                          );
                        } catch {
                        } finally {
                          setAuthSubmitting(
                            false
                          );
                        }
                      }}
                      className="space-y-4"
                    >

                      <div>

                        <label
                          htmlFor="login-identifier"
                          className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2"
                        >
                          Email or Phone
                        </label>

                        <input
                          id="login-identifier"
                          type="text"
                          value={
                            authIdentifier
                          }
                          onChange={(e) =>
                            setAuthIdentifier(
                              e.target.value
                            )
                          }
                          placeholder="Enter email or phone"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-colors"
                          autoComplete="username"
                          disabled={
                            authSubmitting
                          }
                        />

                      </div>


                      <div>

                        <label
                          htmlFor="login-password"
                          className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2"
                        >
                          Password
                        </label>

                        <input
                          id="login-password"
                          type="password"
                          value={
                            authPassword
                          }
                          onChange={(e) =>
                            setAuthPassword(
                              e.target.value
                            )
                          }
                          placeholder="Enter password"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-colors"
                          autoComplete="current-password"
                          disabled={
                            authSubmitting
                          }
                        />

                      </div>


                      <button
                        type="submit"
                        disabled={
                          authSubmitting
                        }
                        className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
                      >
                        {authSubmitting
                          ? 'Signing In...'
                          : 'Sign In'}
                      </button>


                      <div className="pt-4 text-center">

                        <button
                          type="button"
                          disabled={
                            authSubmitting
                          }
                          onClick={() => {
                            setAuthMode(
                              'register'
                            );

                            setAuthRole(
                              'Customer'
                            );

                            setAuthName('');
                            setAuthIdentifier(
                              ''
                            );
                            setAuthPhone('');
                            setAuthPassword('');

                            setRegistrationStep(
                              'role'
                            );
                          }}
                          className="text-orange-500 font-black uppercase tracking-widest text-xs hover:underline disabled:opacity-50"
                        >
                          Don't have an account? Register
                        </button>

                      </div>

                    </form>
                  )}


                  {/* REGISTRATION */}

                  {authMode ===
                    'register' && (

                    <div className="space-y-4">

                      {/* ROLE */}

                      {registrationStep ===
                        'role' && (

                        <>

                          <button
                            type="button"
                            onClick={() =>
                              setAuthRole(
                                'Customer'
                              )
                            }
                            className={cn(
                              'w-full group border p-6 rounded-3xl flex items-center justify-between transition-all text-left',
                              authRole ===
                                'Customer'
                                ? 'bg-orange-600/10 border-orange-500'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            )}
                          >

                            <div>

                              <p className="font-black uppercase tracking-widest text-xs text-orange-500 mb-1">
                                I want to buy tickets
                              </p>

                              <p className="text-xl font-bold">
                                Customer Account
                              </p>

                            </div>

                            <ChevronRight className="text-white/20 group-hover:translate-x-1 transition-transform" />

                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              setAuthRole(
                                'Organizer'
                              )
                            }
                            className={cn(
                              'w-full group border p-6 rounded-3xl flex items-center justify-between transition-all text-left',
                              authRole ===
                                'Organizer'
                                ? 'bg-orange-600/10 border-orange-500'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            )}
                          >

                            <div>

                              <p className="font-black uppercase tracking-widest text-xs text-orange-500 mb-1">
                                I want to host events
                              </p>

                              <p className="text-xl font-bold">
                                Organizer Account
                              </p>

                            </div>

                            <ChevronRight className="text-white/20 group-hover:translate-x-1 transition-transform" />

                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              setRegistrationStep(
                                'form'
                              )
                            }
                            className="w-full bg-orange-600 hover:bg-orange-700 py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
                          >
                            Continue Registration
                          </button>


                          <div className="pt-2 text-center">

                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode(
                                  'login'
                                );
                                setRegistrationStep(
                                  'role'
                                );
                              }}
                              className="text-orange-500 font-black uppercase tracking-widest text-xs hover:underline"
                            >
                              Already have an account? Log in
                            </button>

                          </div>

                        </>
                      )}


                      {/* REGISTRATION FORM */}

                      {registrationStep ===
                        'form' && (

                        <form
                          onSubmit={
                            handleRegistration
                          }
                          className="space-y-4"
                        >

                          <div>

                            <label
                              htmlFor="register-name"
                              className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2"
                            >
                              Full Name
                            </label>

                            <input
                              id="register-name"
                              type="text"
                              value={
                                authName
                              }
                              onChange={(
                                e
                              ) =>
                                setAuthName(
                                  e.target.value
                                )
                              }
                              placeholder="Enter your full name"
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-colors"
                              autoComplete="name"
                              disabled={
                                authSubmitting
                              }
                            />

                          </div>


                          <div>

                            <label
                              htmlFor="register-email"
                              className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2"
                            >
                              Email
                            </label>

                            <input
                              id="register-email"
                              type="email"
                              value={
                                authIdentifier
                              }
                              onChange={(
                                e
                              ) =>
                                setAuthIdentifier(
                                  e.target.value
                                )
                              }
                              placeholder="Enter your email"
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-colors"
                              autoComplete="email"
                              disabled={
                                authSubmitting
                              }
                            />

                          </div>


                          <div>

                            <label
                              htmlFor="register-phone"
                              className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2"
                            >
                              Phone Number
                            </label>

                            <input
                              id="register-phone"
                              type="tel"
                              value={
                                authPhone
                              }
                              onChange={(
                                e
                              ) =>
                                setAuthPhone(
                                  e.target.value
                                )
                              }
                              placeholder="Enter your phone number"
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-colors"
                              autoComplete="tel"
                              disabled={
                                authSubmitting
                              }
                            />

                          </div>


                          <div>

                            <label
                              htmlFor="register-password"
                              className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2"
                            >
                              Password
                            </label>

                            <input
                              id="register-password"
                              type="password"
                              value={
                                authPassword
                              }
                              onChange={(
                                e
                              ) =>
                                setAuthPassword(
                                  e.target.value
                                )
                              }
                              placeholder="Create a password"
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-orange-500 transition-colors"
                              autoComplete="new-password"
                              disabled={
                                authSubmitting
                              }
                            />

                          </div>


                          <button
                            type="submit"
                            disabled={
                              authSubmitting
                            }
                            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 py-4 rounded-2xl font-black uppercase tracking-widest transition-all"
                          >
                            {authSubmitting
                              ? 'Creating Account...'
                              : `Create ${authRole} Account`}
                          </button>


                          <button
                            type="button"
                            disabled={
                              authSubmitting
                            }
                            onClick={() => {
                              setRegistrationStep(
                                'role'
                              );

                              setAuthName('');
                              setAuthIdentifier(
                                ''
                              );
                              setAuthPhone('');
                              setAuthPassword('');
                            }}
                            className="w-full text-white/40 hover:text-white text-xs font-bold uppercase tracking-widest disabled:opacity-30"
                          >
                            ← Back to account type
                          </button>

                        </form>
                      )}

                    </div>
                  )}

                </motion.div>

              </div>

            )}

          </AnimatePresence>


          {/* ==================================================
              ROUTES
          ================================================== */}

          <main className="pt-20 pb-12">

            <Routes>

              <Route
                path="/"
                element={
                  <Home
                    user={user}
                    onAuthRequired={() =>
                      setShowAuthModal(
                        true
                      )
                    }
                  />
                }
              />


              <Route
                path="/event/:id"
                element={
                  <EventDetails
                    user={user}
                    onAuthRequired={() =>
                      setShowAuthModal(
                        true
                      )
                    }
                  />
                }
              />


              <Route
                path="/profile"
                element={
                  <Profile
                    user={user}
                  />
                }
              />


              <Route
                path="/admin"
                element={
                  <AdminDashboard
                    user={user}
                  />
                }
              />


              <Route
                path="/organizer"
                element={
                  <OrganizerDashboard
                    user={user}
                  />
                }
              />


              <Route
                path="/organizer/wallet"
                element={
                  <OrganizerWallet
                    user={user}
                  />
                }
              />


              <Route
                path="/sponsors"
                element={
                  <Sponsors />
                }
              />


              <Route
                path="/advertise"
                element={
                  <Advertise />
                }
              />


              <Route
                path="/competitions"
                element={
                  <Competitions
                    user={user}
                    onAuthRequired={() =>
                      setShowAuthModal(
                        true
                      )
                    }
                  />
                }
              />


              <Route
                path="/verify-ticket"
                element={
                  <TicketVerify />
                }
              />


              <Route
                path="/scanner"
                element={
                  <OrganizerScannerLoginScreen
                    user={user}
                    onLogin={
                      handleLogin
                    }
                  />
                }
              />


              <Route
                path="/scanner/gate"
                element={
                  <SelectGateScreen
                    user={user}
                    onGateSelect={
                      setSelectedGate
                    }
                  />
                }
              />


              <Route
                path="/scanner/events"
                element={
                  <SelectActiveEventScreen
                    user={user}
                    onEventSelect={
                      setSelectedEvent
                    }
                  />
                }
              />


              <Route
                path="/scanner/scan"
                element={
                  <ScannerScreen
                    user={user}
                    event={
                      selectedEvent
                    }
                    gate={
                      selectedGate
                    }
                  />
                }
              />


              <Route
                path="*"
                element={
                  <div className="min-h-[60vh] flex items-center justify-center px-4">
                    <div className="text-center">

                      <p className="text-orange-500 text-xs font-black uppercase tracking-[0.3em] mb-3">
                        404
                      </p>

                      <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">
                        Page Not Found
                      </h1>

                      <p className="text-white/40 mb-6">
                        The page you are looking for does not exist.
                      </p>

                      <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Back to Events
                      </Link>

                    </div>
                  </div>
                }
              />

            </Routes>

          </main>

        </div>

      </Router>
    </ErrorBoundary>
  );
}