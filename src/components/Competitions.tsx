import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Vote as VoteIcon,
  Plus,
  Search,
  X,
  CheckCircle2,
  Smartphone,
  Wallet,
  CreditCard,
  Sparkles,
  ShieldCheck,
  MapPin,
  Trash2,
  ArrowRight,
  Flame
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Competition,
  Candidate,
  UserProfile,
  VotePackage,
  VoteTransaction
} from '../types';

import { cn } from '../lib/utils';
import DeviceImagePicker from './DeviceImagePicker';

interface CompetitionsProps {
  user?: UserProfile | null;
  onAuthRequired?: () => void;
}

/*
|--------------------------------------------------------------------------
| STORAGE KEYS
|--------------------------------------------------------------------------
| These keys are shared by Organizer and Customer sessions.
| This is the important fix that prevents competitions disappearing
| after logout/login.
*/
const COMPETITIONS_STORAGE_KEY = 'swift_ticket_competitions_v1';
const VOTE_TRANSACTIONS_STORAGE_KEY = 'swift_ticket_vote_transactions_v1';

/*
|--------------------------------------------------------------------------
| Safe localStorage helpers
|--------------------------------------------------------------------------
*/

function loadStoredCompetitions(): Competition[] {
  try {
    const raw = localStorage.getItem(COMPETITIONS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load competitions:', error);
    return [];
  }
}

function saveStoredCompetitions(competitions: Competition[]) {
  try {
    localStorage.setItem(
      COMPETITIONS_STORAGE_KEY,
      JSON.stringify(competitions)
    );
  } catch (error) {
    console.error('Failed to save competitions:', error);
  }
}

function loadStoredTransactions(): VoteTransaction[] {
  try {
    const raw = localStorage.getItem(VOTE_TRANSACTIONS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load vote transactions:', error);
    return [];
  }
}

function saveStoredTransactions(transactions: VoteTransaction[]) {
  try {
    localStorage.setItem(
      VOTE_TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(transactions)
    );
  } catch (error) {
    console.error('Failed to save vote transactions:', error);
  }
}

export default function Competitions({
  user,
  onAuthRequired
}: CompetitionsProps) {
  /*
  |--------------------------------------------------------------------------
  | COMPETITIONS
  |--------------------------------------------------------------------------
  | IMPORTANT:
  | We initialize from localStorage instead of [].
  */
  const [competitions, setCompetitions] = useState<Competition[]>(
    () => loadStoredCompetitions()
  );

  const [voteTransactions, setVoteTransactions] = useState<VoteTransaction[]>(
    () => loadStoredTransactions()
  );

  /*
  |--------------------------------------------------------------------------
  | Keep localStorage synchronized
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    saveStoredCompetitions(competitions);
  }, [competitions]);

  useEffect(() => {
    saveStoredTransactions(voteTransactions);
  }, [voteTransactions]);

  /*
  |--------------------------------------------------------------------------
  | Cross-tab synchronization
  |--------------------------------------------------------------------------
  | If Organizer creates a competition in one browser tab, another tab
  | can see it without refreshing.
  */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === COMPETITIONS_STORAGE_KEY) {
        setCompetitions(loadStoredCompetitions());
      }

      if (event.key === VOTE_TRANSACTIONS_STORAGE_KEY) {
        setVoteTransactions(loadStoredTransactions());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [selectedComp, setSelectedComp] =
    useState<Competition | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  /*
  |--------------------------------------------------------------------------
  | ORGANIZER SETUP WIZARD
  |--------------------------------------------------------------------------
  */

  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [compTitle, setCompTitle] = useState('');
  const [associatedEvent, setAssociatedEvent] = useState('');
  const [category, setCategory] =
    useState('Music & DJ Battles');
  const [location, setLocation] =
    useState('Monrovia, Liberia');
  const [compDesc, setCompDesc] = useState('');

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [endDate, setEndDate] = useState(
    new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0]
  );

  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80'
  );

  // Step 2
  const [baseVotePrice, setBaseVotePrice] =
    useState(0.5);

  const [commissionRate] = useState(0.1);

  // Step 3
  const [draftCandidates, setDraftCandidates] =
    useState<
      Array<{
        contestantNumber: string;
        name: string;
        description: string;
        imageUrl: string;
      }>
    >([
      {
        contestantNumber: '#01',
        name: '',
        description: '',
        imageUrl:
          'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&q=80'
      },
      {
        contestantNumber: '#02',
        name: '',
        description: '',
        imageUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80'
      }
    ]);

  // Step 4
  const [showLiveLeaderboard, setShowLiveLeaderboard] =
    useState(true);

  /*
  |--------------------------------------------------------------------------
  | ADD CONTESTANT
  |--------------------------------------------------------------------------
  */

  const [addContestantComp, setAddContestantComp] =
    useState<Competition | null>(null);

  const [newCandidateName, setNewCandidateName] =
    useState('');

  const [newCandidateNumber, setNewCandidateNumber] =
    useState('');

  const [newCandidateDesc, setNewCandidateDesc] =
    useState('');

  const [newCandidateImage, setNewCandidateImage] =
    useState(
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80'
    );

  /*
  |--------------------------------------------------------------------------
  | VOTING
  |--------------------------------------------------------------------------
  */

  const [votingTarget, setVotingTarget] =
    useState<{
      comp: Competition;
      candidate: Candidate;
    } | null>(null);

  const [selectedVotePackage, setSelectedVotePackage] =
    useState<VotePackage>({
      votes: 5,
      price: 2.5
    });

  const [voterName, setVoterName] =
    useState(user?.name || '');

  const [voterPhone, setVoterPhone] =
    useState(
      user?.phone || '+231 77 000 0000'
    );

  const [paymentMethod, setPaymentMethod] =
    useState<
      'orange_money' | 'mtn_momo' | 'card' | 'wallet'
    >('orange_money');

  const [isProcessingVote, setIsProcessingVote] =
    useState(false);

  const [voteSuccess, setVoteSuccess] =
    useState(false);

  const [lastTxRef, setLastTxRef] =
    useState('');

  /*
  |--------------------------------------------------------------------------
  | USER ROLE
  |--------------------------------------------------------------------------
  */

  const isOrganizer =
    user?.role === 'Organizer' ||
    user?.role === 'Admin';

  /*
  |--------------------------------------------------------------------------
  | Keep voter information synchronized with logged-in user
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (user) {
      setVoterName(user.name || '');
      setVoterPhone(
        user.phone || '+231 77 000 0000'
      );
    }
  }, [user]);

  /*
  |--------------------------------------------------------------------------
  | OPEN ORGANIZER WIZARD
  |--------------------------------------------------------------------------
  */

  const handleStartSetupWizard = () => {
    if (!user) {
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        toast.info(
          'Please sign in as an Organizer.'
        );
      }

      return;
    }

    if (!isOrganizer) {
      toast.error(
        'Only organizers can create competitions.'
      );
      return;
    }

    setWizardStep(1);
    setShowSetupWizard(true);
  };

  /*
  |--------------------------------------------------------------------------
  | DRAFT CONTESTANTS
  |--------------------------------------------------------------------------
  */

  const handleAddDraftCandidate = () => {
    const nextNumber =
      String(draftCandidates.length + 1).padStart(
        2,
        '0'
      );

    setDraftCandidates(prev => [
      ...prev,
      {
        contestantNumber: `#${nextNumber}`,
        name: '',
        description: '',
        imageUrl:
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80'
      }
    ]);
  };

  const handleRemoveDraftCandidate = (
    index: number
  ) => {
    setDraftCandidates(prev =>
      prev.filter((_, idx) => idx !== index)
    );
  };

  const handleDraftCandidateChange = (
    index: number,
    field:
      | 'contestantNumber'
      | 'name'
      | 'description'
      | 'imageUrl',
    value: string
  ) => {
    setDraftCandidates(prev => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value
      };

      return updated;
    });
  };

  /*
  |--------------------------------------------------------------------------
  | PUBLISH COMPETITION
  |--------------------------------------------------------------------------
  */

  const handlePublishCompetition = () => {
    if (!user) {
      toast.error(
        'You must be logged in as an Organizer.'
      );
      return;
    }

    if (!isOrganizer) {
      toast.error(
        'Only organizers can publish competitions.'
      );
      return;
    }

    if (!compTitle.trim()) {
      toast.error(
        'Please enter a competition title.'
      );
      setWizardStep(1);
      return;
    }

    if (!compDesc.trim()) {
      toast.error(
        'Please enter a competition description.'
      );
      setWizardStep(1);
      return;
    }

    const filteredCandidates: Candidate[] =
      draftCandidates
        .filter(
          candidate =>
            candidate.name.trim().length > 0
        )
        .map((candidate, index) => ({
          id: `cand-${Date.now()}-${index}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,

          contestantNumber:
            candidate.contestantNumber ||
            `#${String(index + 1).padStart(2, '0')}`,

          name: candidate.name.trim(),

          description:
            candidate.description.trim() ||
            'Contestant candidate',

          imageUrl:
            candidate.imageUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',

          voteCount: 0
        }));

    if (filteredCandidates.length === 0) {
      toast.error(
        'Please add at least one contestant before publishing.'
      );
      setWizardStep(3);
      return;
    }

    const defaultPackages: VotePackage[] = [
      {
        votes: 1,
        price: Number(
          baseVotePrice.toFixed(2)
        )
      },

      {
        votes: 5,
        price: Number(
          (baseVotePrice * 5).toFixed(2)
        )
      },

      {
        votes: 10,
        price: Number(
          (baseVotePrice * 10).toFixed(2)
        ),
        discountLabel: 'Popular'
      },

      {
        votes: 25,
        price: Number(
          (baseVotePrice * 25).toFixed(2)
        ),
        discountLabel: 'Best Value'
      },

      {
        votes: 50,
        price: Number(
          (baseVotePrice * 50).toFixed(2)
        ),
        discountLabel: 'VIP Supporter'
      },

      {
        votes: 100,
        price: Number(
          (baseVotePrice * 100).toFixed(2)
        ),
        discountLabel: 'Mega Package'
      }
    ];

    const newCompetition: Competition = {
      id: `comp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      title: compTitle.trim(),

      description: compDesc.trim(),

      associatedEvent:
        associatedEvent.trim() ||
        'Liberia Event Series',

      category,

      location,

      votePrice: baseVotePrice,

      commissionRate,

      showLiveLeaderboard,

      votePackages: defaultPackages,

      imageUrl:
        imageUrl ||
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',

      /*
      |--------------------------------------------------------------------------
      | VERY IMPORTANT
      |--------------------------------------------------------------------------
      | Save the real organizer ID.
      */
      organizerId: user.uid,

      startDate: new Date(
        `${startDate}T00:00:00`
      ).toISOString(),

      endDate: new Date(
        `${endDate}T23:59:59`
      ).toISOString(),

      status: 'Active',

      candidates: filteredCandidates
    };

    /*
    |--------------------------------------------------------------------------
    | IMPORTANT FIX:
    | Functional update prevents stale state.
    | useEffect below automatically saves the result to localStorage.
    |--------------------------------------------------------------------------
    */

    setCompetitions(prev => [
      newCompetition,
      ...prev
    ]);

    /*
    |--------------------------------------------------------------------------
    | Immediately save too.
    | This makes sure the competition is available even if the component
    | changes immediately after publishing.
    |--------------------------------------------------------------------------
    */

    const currentCompetitions =
      loadStoredCompetitions();

    saveStoredCompetitions([
      newCompetition,
      ...currentCompetitions
    ]);

    setShowSetupWizard(false);

    toast.success(
      `Competition "${newCompetition.title}" is now live with ${filteredCandidates.length} contestant(s)!`
    );

    /*
    |--------------------------------------------------------------------------
    | Reset wizard
    |--------------------------------------------------------------------------
    */

    setCompTitle('');
    setAssociatedEvent('');
    setCompDesc('');

    setDraftCandidates([
      {
        contestantNumber: '#01',
        name: '',
        description: '',
        imageUrl:
          'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?w=400&q=80'
      },
      {
        contestantNumber: '#02',
        name: '',
        description: '',
        imageUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80'
      }
    ]);

    setWizardStep(1);
  };

  /*
  |--------------------------------------------------------------------------
  | ADD CONTESTANT TO EXISTING COMPETITION
  |--------------------------------------------------------------------------
  */

  const handleAddContestantToExisting = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!addContestantComp) {
      return;
    }

    if (!isOrganizer) {
      toast.error(
        'Only organizers can add contestants.'
      );
      return;
    }

    if (!newCandidateName.trim()) {
      toast.error(
        'Contestant name is required.'
      );
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Make sure organizer owns this competition.
    |--------------------------------------------------------------------------
    */

    if (
      addContestantComp.organizerId &&
      user?.uid &&
      addContestantComp.organizerId !== user.uid &&
      user.role !== 'Admin'
    ) {
      toast.error(
        'You can only edit your own competitions.'
      );
      return;
    }

    const nextNumber =
      newCandidateNumber.trim() ||
      `#${String(
        addContestantComp.candidates.length + 1
      ).padStart(2, '0')}`;

    const newCandidate: Candidate = {
      id: `cand-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      contestantNumber: nextNumber,

      name: newCandidateName.trim(),

      description:
        newCandidateDesc.trim() ||
        'Contestant candidate',

      imageUrl:
        newCandidateImage ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',

      voteCount: 0
    };

    setCompetitions(prev =>
      prev.map(competition => {
        if (
          competition.id !==
          addContestantComp.id
        ) {
          return competition;
        }

        return {
          ...competition,
          candidates: [
            ...competition.candidates,
            newCandidate
          ]
        };
      })
    );

    setSelectedComp(prev => {
      if (
        !prev ||
        prev.id !== addContestantComp.id
      ) {
        return prev;
      }

      return {
        ...prev,
        candidates: [
          ...prev.candidates,
          newCandidate
        ]
      };
    });

    /*
    |--------------------------------------------------------------------------
    | Persist immediately.
    |--------------------------------------------------------------------------
    */

    const stored =
      loadStoredCompetitions();

    const updatedStored =
      stored.map(competition => {
        if (
          competition.id !==
          addContestantComp.id
        ) {
          return competition;
        }

        return {
          ...competition,
          candidates: [
            ...competition.candidates,
            newCandidate
          ]
        };
      });

    saveStoredCompetitions(
      updatedStored
    );

    toast.success(
      `Added ${newCandidate.name} (${nextNumber}) to ${addContestantComp.title}!`
    );

    setAddContestantComp(null);
    setNewCandidateName('');
    setNewCandidateNumber('');
    setNewCandidateDesc('');
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN VOTE MODAL
  |--------------------------------------------------------------------------
  */

  const handleOpenVoteModal = (
    comp: Competition,
    candidate: Candidate,
    e?: React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
    }

    const defaultPackage =
      comp.votePackages?.[1] || {
        votes: 5,
        price: Number(
          ((comp.votePrice || 0.5) * 5).toFixed(
            2
          )
        )
      };

    setVotingTarget({
      comp,
      candidate
    });

    setSelectedVotePackage(
      defaultPackage
    );

    setVoteSuccess(false);
    setIsProcessingVote(false);

    if (user) {
      setVoterName(user.name || '');

      setVoterPhone(
        user.phone ||
          '+231 77 000 0000'
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CONFIRM VOTE PAYMENT
  |--------------------------------------------------------------------------
  */

  const handleConfirmVotePayment = () => {
    if (!votingTarget) {
      return;
    }

    if (!user) {
      toast.error(
        'Please login before voting.'
      );

      if (onAuthRequired) {
        onAuthRequired();
      }

      return;
    }

    if (!voterPhone.trim()) {
      toast.error(
        'Please enter your Mobile Money phone number.'
      );
      return;
    }

    setIsProcessingVote(true);

    setTimeout(() => {
      const purchasedVotes =
        selectedVotePackage.votes;

      const totalAmount =
        selectedVotePackage.price;

      const {
        comp,
        candidate
      } = votingTarget;

      const rate =
        comp.commissionRate ?? 0.1;

      const commission = Number(
        (
          totalAmount * rate
        ).toFixed(2)
      );

      const netEarnings = Number(
        (
          totalAmount -
          commission
        ).toFixed(2)
      );

      const txRef =
        `VOTE-${paymentMethod.toUpperCase()}-${Math.floor(
          10000 +
            Math.random() * 90000
        )}`;

      const newTransaction: VoteTransaction =
        {
          id: `vt-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,

          competitionId: comp.id,

          competitionTitle:
            comp.title,

          candidateId:
            candidate.id,

          candidateName:
            candidate.name,

          contestantNumber:
            candidate.contestantNumber,

          voterName:
            voterName.trim() ||
            'Anonymous Voter',

          voterPhone:
            voterPhone.trim(),

          voteQuantity:
            purchasedVotes,

          amountPaid:
            totalAmount,

          commissionAmount:
            commission,

          organizerEarnings:
            netEarnings,

          paymentMethod,

          reference:
            txRef,

          timestamp:
            new Date().toISOString()
        };

      /*
      |--------------------------------------------------------------------------
      | Save transaction
      |--------------------------------------------------------------------------
      */

      setVoteTransactions(prev => [
        newTransaction,
        ...prev
      ]);

      const storedTransactions =
        loadStoredTransactions();

      saveStoredTransactions([
        newTransaction,
        ...storedTransactions
      ]);

      /*
      |--------------------------------------------------------------------------
      | UPDATE COMPETITION VOTE COUNT
      |--------------------------------------------------------------------------
      */

      setCompetitions(prev =>
        prev.map(competition => {
          if (
            competition.id !==
            comp.id
          ) {
            return competition;
          }

          return {
            ...competition,

            candidates:
              competition.candidates.map(
                contestant => {
                  if (
                    contestant.id !==
                    candidate.id
                  ) {
                    return contestant;
                  }

                  return {
                    ...contestant,

                    voteCount:
                      contestant.voteCount +
                      purchasedVotes
                  };
                }
              )
          };
        })
      );

      /*
      |--------------------------------------------------------------------------
      | Update selected competition immediately
      |--------------------------------------------------------------------------
      */

      setSelectedComp(prev => {
        if (
          !prev ||
          prev.id !== comp.id
        ) {
          return prev;
        }

        return {
          ...prev,

          candidates:
            prev.candidates.map(
              contestant => {
                if (
                  contestant.id !==
                  candidate.id
                ) {
                  return contestant;
                }

                return {
                  ...contestant,

                  voteCount:
                    contestant.voteCount +
                    purchasedVotes
                };
              }
            )
        };
      });

      /*
      |--------------------------------------------------------------------------
      | Persist vote count immediately
      |--------------------------------------------------------------------------
      */

      const storedCompetitions =
        loadStoredCompetitions();

      const updatedCompetitions =
        storedCompetitions.map(
          competition => {
            if (
              competition.id !==
              comp.id
            ) {
              return competition;
            }

            return {
              ...competition,

              candidates:
                competition.candidates.map(
                  contestant => {
                    if (
                      contestant.id !==
                      candidate.id
                    ) {
                      return contestant;
                    }

                    return {
                      ...contestant,

                      voteCount:
                        contestant.voteCount +
                        purchasedVotes
                    };
                  }
                )
            };
          }
        );

      saveStoredCompetitions(
        updatedCompetitions
      );

      setIsProcessingVote(false);
      setVoteSuccess(true);
      setLastTxRef(txRef);

      toast.success(
        `${purchasedVotes} vote(s) successfully added for ${candidate.name}!`
      );
    }, 1200);
  };

  /*
  |--------------------------------------------------------------------------
  | FILTERING
  |--------------------------------------------------------------------------
  */

  const categories = [
    'All',
    'Music & DJ Battles',
    'Beauty & Fashion',
    'Talent Hunt',
    'Dance Championship',
    'Sports & Gaming'
  ];

  const filteredCompetitions =
    competitions.filter(comp => {
      const search =
        searchQuery.toLowerCase();

      const matchesSearch =
        comp.title
          .toLowerCase()
          .includes(search) ||

        comp.description
          .toLowerCase()
          .includes(search) ||

        (
          comp.category || ''
        )
          .toLowerCase()
          .includes(search) ||

        (
          comp.associatedEvent || ''
        )
          .toLowerCase()
          .includes(search);

      const matchesCategory =
        activeCategory === 'All' ||
        comp.category ===
          activeCategory;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">

      {/* ================================================================ */}
      {/* HEADER */}
      {/* ================================================================ */}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">

        <div>
          <motion.div
            initial={{
              opacity: 0,
              x: -20
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-500 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-3 border border-orange-500/20"
          >
            <Trophy size={14} />
            Official Voting & Leaderboard Portal
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-2">
            Vote For Your Favorites
          </h1>

          <p className="text-white/40 max-w-2xl text-sm md:text-base">
            Pick your top contestant in Liberia&apos;s
            pageants, DJ battles, and talent
            competitions. Cast votes instantly via
            Mobile Money.
          </p>
        </div>

        {isOrganizer && (
          <button
            onClick={
              handleStartSetupWizard
            }
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-7 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-600/20 shrink-0"
          >
            <Plus size={16} />

            Setup New Competition
          </button>
        )}
      </div>

      {/* ================================================================ */}
      {/* SEARCH */}
      {/* ================================================================ */}

      <div className="space-y-4 mb-10">

        <div className="relative">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30"
            size={20}
          />

          <input
            type="text"
            placeholder="Search competitions, categories, or events..."
            className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-4 pl-16 pr-8 text-sm font-bold focus:outline-none focus:border-orange-500 transition-all placeholder:text-white/20"
            value={searchQuery}
            onChange={e =>
              setSearchQuery(
                e.target.value
              )
            }
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() =>
                setActiveCategory(cat)
              }
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap border',

                activeCategory === cat
                  ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                  : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================ */}
      {/* EMPTY STATE */}
      {/* ================================================================ */}

      {filteredCompetitions.length === 0 && (
        <div className="py-20 text-center border border-white/10 bg-white/5 rounded-[2.5rem]">

          <Trophy
            size={48}
            className="mx-auto text-orange-500/50 mb-5"
          />

          <h2 className="text-2xl font-black uppercase">
            No Competitions Found
          </h2>

          <p className="text-white/40 text-sm mt-2 max-w-md mx-auto">
            {competitions.length === 0
              ? 'No competitions have been published yet. Organizers can create the first competition.'
              : 'Try changing your search or category filter.'}
          </p>

          {isOrganizer && (
            <button
              onClick={
                handleStartSetupWizard
              }
              className="mt-6 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest"
            >
              <Plus
                size={14}
                className="inline mr-2"
              />
              Create Competition
            </button>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* COMPETITIONS */}
      {/* ================================================================ */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

        {filteredCompetitions.map(
          (comp, idx) => {
            const sortedCandidates = [
              ...comp.candidates
            ].sort(
              (a, b) =>
                b.voteCount -
                a.voteCount
            );

            const topCandidate =
              sortedCandidates[0];

            return (
              <motion.div
                key={comp.id}
                initial={{
                  opacity: 0,
                  y: 20
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  delay:
                    idx * 0.08
                }}
                className="group bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden hover:bg-white/10 transition-all cursor-pointer flex flex-col justify-between"
                onClick={() =>
                  setSelectedComp(
                    comp
                  )
                }
              >
                <div>

                  <div className="relative aspect-video overflow-hidden">

                    <img
                      src={comp.imageUrl}
                      alt={comp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-400 border border-orange-500/30">
                      {comp.category ||
                        'Competition'}
                    </div>

                    {comp.showLiveLeaderboard && (
                      <div className="absolute top-4 right-4 bg-green-500/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/40 text-green-400 flex items-center gap-1">
                        <Flame
                          size={10}
                        />
                        Live Leaderboard
                      </div>
                    )}
                  </div>

                  <div className="p-6 md:p-8">

                    {comp.associatedEvent && (
                      <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles
                          size={12}
                        />
                        {
                          comp.associatedEvent
                        }
                      </p>
                    )}

                    <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 line-clamp-1">
                      {comp.title}
                    </h2>

                    <p className="text-white/40 text-xs line-clamp-2 mb-6">
                      {
                        comp.description
                      }
                    </p>

                    {topCandidate && (
                      <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl mb-6 flex items-center justify-between gap-3">

                        <div className="flex items-center gap-3">

                          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0">

                            <img
                              src={
                                topCandidate.imageUrl
                              }
                              alt={
                                topCandidate.name
                              }
                              className="w-full h-full object-cover"
                            />

                            <span className="absolute bottom-0 right-0 bg-orange-600 text-[8px] font-black px-1 rounded-tl text-white">
                              #1
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block">
                              Leading Contestant
                            </span>

                            <p className="text-xs font-black truncate">
                              {
                                topCandidate.name
                              }{' '}
                              {topCandidate.contestantNumber &&
                                `(${topCandidate.contestantNumber})`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-white">
                            {topCandidate.voteCount.toLocaleString()}
                          </span>

                          <span className="text-[9px] text-white/40 block uppercase">
                            Votes
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-1">
                          {
                            comp
                              .candidates
                              .length
                          }{' '}
                          Contestants
                        </span>

                        <div className="flex -space-x-2">
                          {comp.candidates
                            .slice(
                              0,
                              4
                            )
                            .map(
                              candidate => (
                                <div
                                  key={
                                    candidate.id
                                  }
                                  className="w-7 h-7 rounded-full border-2 border-[#0a0a0a] overflow-hidden bg-white/10"
                                >
                                  <img
                                    src={
                                      candidate.imageUrl
                                    }
                                    alt={
                                      candidate.name
                                    }
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )
                            )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 block mb-0.5">
                          Vote From
                        </span>

                        <span className="text-xs font-black text-orange-400">
                          $
                          {(
                            comp.votePrice ||
                            0.5
                          ).toFixed(2)}{' '}
                          / Vote
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedComp(
                        comp
                      );
                    }}
                    className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <VoteIcon
                      size={14}
                      className="text-orange-500"
                    />
                    View Candidates & Vote
                  </button>
                </div>
              </motion.div>
            );
          }
        )}
      </div>

      {/* ================================================================ */}
      {/* COMPETITION DETAILS MODAL */}
      {/* ================================================================ */}

      <AnimatePresence>
        {selectedComp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

            <motion.div
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              onClick={() =>
                setSelectedComp(
                  null
                )
              }
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
              initial={{
                scale: 0.95,
                opacity: 0,
                y: 20
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0
              }}
              exit={{
                scale: 0.95,
                opacity: 0,
                y: 20
              }}
              className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-[3rem] overflow-hidden max-h-[90vh] flex flex-col shadow-2xl"
            >

              <div className="absolute top-6 right-6 z-10">
                <button
                  onClick={() =>
                    setSelectedComp(
                      null
                    )
                  }
                  className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white/40 hover:text-white border border-white/10"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto p-6 md:p-10 space-y-8 no-scrollbar">

                <div className="flex flex-col md:flex-row gap-6 items-start">

                  <div className="w-full md:w-1/3 aspect-video md:aspect-square rounded-[2rem] overflow-hidden shrink-0">
                    <img
                      src={
                        selectedComp.imageUrl
                      }
                      alt={
                        selectedComp.title
                      }
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-3 flex-1">

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {
                          selectedComp.category ||
                          'General Competition'
                        }
                      </span>

                      {selectedComp.associatedEvent && (
                        <span className="bg-white/10 text-white/70 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                          <Sparkles
                            size={10}
                          />
                          {
                            selectedComp.associatedEvent
                          }
                        </span>
                      )}
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-tight">
                      {
                        selectedComp.title
                      }
                    </h2>

                    <p className="text-white/60 text-sm leading-relaxed">
                      {
                        selectedComp.description
                      }
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-white/40 pt-2">

                      {selectedComp.location && (
                        <span className="flex items-center gap-1">
                          <MapPin
                            size={14}
                            className="text-orange-500"
                          />
                          {
                            selectedComp.location
                          }
                        </span>
                      )}

                      <span>•</span>

                      <span>
                        Ends:{' '}
                        {new Date(
                          selectedComp.endDate
                        ).toLocaleDateString()}
                      </span>

                      <span>•</span>

                      <span className="text-orange-400 font-black">
                        $
                        {(
                          selectedComp.votePrice ||
                          0.5
                        ).toFixed(2)}{' '}
                        / Vote
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-6 gap-4">

                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                      <Trophy size={22} />
                      Live Contestant Leaderboard
                    </h3>

                    <p className="text-xs text-white/40">
                      Real-time standings. Tap
                      &quot;Vote Now&quot; to vote.
                    </p>
                  </div>

                  {isOrganizer &&
                    (
                      selectedComp.organizerId ===
                        user?.uid ||
                      user?.role ===
                        'Admin'
                    ) && (
                      <button
                        onClick={() =>
                          setAddContestantComp(
                            selectedComp
                          )
                        }
                        className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                      >
                        <Plus
                          size={14}
                          className="text-orange-500"
                        />
                        Add Contestant
                      </button>
                    )}
                </div>

                {[...selectedComp.candidates]
                  .sort(
                    (a, b) =>
                      b.voteCount -
                      a.voteCount
                  )
                  .map(
                    (
                      candidate,
                      rank
                    ) => (
                      <div
                        key={
                          candidate.id
                        }
                        className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-5 group hover:bg-white/10 transition-all"
                      >

                        <div className="flex items-center gap-4 w-full sm:w-auto">

                          <div className="w-10 h-10 rounded-full bg-orange-600/20 text-orange-400 flex items-center justify-center font-black text-sm shrink-0 border border-orange-500/30">
                            #
                            {rank +
                              1}
                          </div>

                          <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-white/10">
                            <img
                              src={
                                candidate.imageUrl
                              }
                              alt={
                                candidate.name
                              }
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="min-w-0">

                            <div className="flex items-center gap-2">

                              <h4 className="text-lg font-black truncate">
                                {
                                  candidate.name
                                }
                              </h4>

                              {candidate.contestantNumber && (
                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/60 font-mono">
                                  {
                                    candidate.contestantNumber
                                  }
                                </span>
                              )}
                            </div>

                            <p className="text-white/40 text-xs truncate">
                              {
                                candidate.description
                              }
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10">

                          <div className="text-left sm:text-right">
                            <div className="text-lg font-black text-orange-400 uppercase tracking-wider">
                              {candidate.voteCount.toLocaleString()}{' '}
                              <span className="text-xs text-white/40">
                                Votes
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={e =>
                              handleOpenVoteModal(
                                selectedComp,
                                candidate,
                                e
                              )
                            }
                            className="bg-orange-600 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-orange-500 transition-all shadow-md flex items-center gap-1.5"
                          >
                            <VoteIcon
                              size={14}
                            />
                            Vote Now
                          </button>
                        </div>
                      </div>
                    )
                  )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* ORGANIZER WIZARD */}
      {/* ================================================================ */}

      <AnimatePresence>
        {showSetupWizard && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">

            <motion.div
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              onClick={() =>
                setShowSetupWizard(
                  false
                )
              }
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0,
                y: 20
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0
              }}
              exit={{
                scale: 0.9,
                opacity: 0,
                y: 20
              }}
              className="relative w-full max-w-3xl bg-[#111] border border-white/10 p-8 md:p-10 rounded-[3rem] overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl"
            >

              <button
                onClick={() =>
                  setShowSetupWizard(
                    false
                  )
                }
                className="absolute top-6 right-6 text-white/40 hover:text-white"
              >
                <X size={22} />
              </button>

              <div className="mb-8">

                <div className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-orange-500/30">
                  <Sparkles size={12} />
                  Organizer Setup Flow
                </div>

                <h2 className="text-3xl font-black uppercase tracking-tighter">
                  Host Competition
                </h2>

                <div className="grid grid-cols-4 gap-2 mt-4">

                  {[
                    {
                      step: 1,
                      label: '1. Details'
                    },
                    {
                      step: 2,
                      label: '2. Pricing'
                    },
                    {
                      step: 3,
                      label: '3. Contestants'
                    },
                    {
                      step: 4,
                      label: '4. Publish'
                    }
                  ].map(step => (
                    <div
                      key={
                        step.step
                      }
                      onClick={() =>
                        setWizardStep(
                          step.step as
                            | 1
                            | 2
                            | 3
                            | 4
                        )
                      }
                      className={cn(
                        'py-2 px-3 rounded-xl text-center text-xs font-black uppercase tracking-wider cursor-pointer transition-all border',

                        wizardStep ===
                          step.step
                          ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                          : wizardStep >
                            step.step
                          ? 'bg-white/10 text-orange-400 border-white/10'
                          : 'bg-white/5 text-white/30 border-white/5'
                      )}
                    >
                      {
                        step.label
                      }
                    </div>
                  ))}
                </div>
              </div>

              {/* STEP 1 */}

              {wizardStep === 1 && (
                <div className="space-y-4">

                  <h3 className="text-xl font-black uppercase text-orange-400">
                    Step 1: Competition Details
                  </h3>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                      Competition Name / Title *
                    </label>

                    <input
                      type="text"
                      placeholder="e.g. Liberia Gospel Music Championship 2026"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500"
                      value={
                        compTitle
                      }
                      onChange={e =>
                        setCompTitle(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                        Associated Event
                      </label>

                      <input
                        type="text"
                        placeholder="e.g. Summer Wave Beach Fest 2026"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500"
                        value={
                          associatedEvent
                        }
                        onChange={e =>
                          setAssociatedEvent(
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                        Category
                      </label>

                      <select
                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500 text-white"
                        value={
                          category
                        }
                        onChange={e =>
                          setCategory(
                            e.target.value
                          )
                        }
                      >
                        <option>
                          Music & DJ Battles
                        </option>
                        <option>
                          Beauty & Fashion
                        </option>
                        <option>
                          Talent Hunt
                        </option>
                        <option>
                          Dance Championship
                        </option>
                        <option>
                          Sports & Gaming
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                        Start Date
                      </label>

                      <input
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500 text-white"
                        value={
                          startDate
                        }
                        onChange={e =>
                          setStartDate(
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                        End Date
                      </label>

                      <input
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500 text-white"
                        value={
                          endDate
                        }
                        onChange={e =>
                          setEndDate(
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <DeviceImagePicker
                    label="Competition Banner Image"
                    value={
                      imageUrl
                    }
                    onChange={
                      setImageUrl
                    }
                    presetCategory="competition"
                  />

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                      Description & Rules *
                    </label>

                    <textarea
                      placeholder="Describe rules, voting criteria, and prizes..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500"
                      value={
                        compDesc
                      }
                      onChange={e =>
                        setCompDesc(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="pt-4 flex justify-end">

                    <button
                      onClick={() => {
                        if (
                          !compTitle.trim() ||
                          !compDesc.trim()
                        ) {
                          toast.error(
                            'Please complete the competition title and description.'
                          );
                          return;
                        }

                        setWizardStep(
                          2
                        );
                      }}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2"
                    >
                      Next: Pricing
                      <ArrowRight
                        size={16}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 */}

              {wizardStep === 2 && (
                <div className="space-y-6">

                  <h3 className="text-xl font-black uppercase text-orange-400">
                    Step 2: Pricing for Votes & Packages
                  </h3>

                  <div>

                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-1">
                      Base Single Vote Price
                    </label>

                    <div className="grid grid-cols-4 gap-3 mb-2">

                      {[0.25, 0.5, 1, 2].map(
                        price => (
                          <button
                            key={
                              price
                            }
                            type="button"
                            onClick={() =>
                              setBaseVotePrice(
                                price
                              )
                            }
                            className={cn(
                              'py-3 rounded-2xl font-black text-sm transition-all border',

                              baseVotePrice ===
                                price
                                ? 'bg-orange-600 text-white border-orange-500'
                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                            )}
                          >
                            $
                            {price.toFixed(
                              2
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">

                    <h4 className="text-xs font-black uppercase tracking-widest text-orange-400">
                      Generated Vote Packages
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                      {[1, 5, 10, 25, 50, 100].map(
                        qty => (
                          <div
                            key={
                              qty
                            }
                            className="p-3 bg-black/40 border border-white/10 rounded-xl text-center"
                          >
                            <span className="text-xs font-black text-white block">
                              {qty}{' '}
                              Votes
                            </span>

                            <span className="text-sm font-black text-orange-400">
                              $
                              {(
                                qty *
                                baseVotePrice
                              ).toFixed(
                                2
                              )}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  <div className="bg-orange-500/10 border border-orange-500/30 p-5 rounded-2xl space-y-2">

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-orange-400 tracking-wider">
                        Platform Commission
                      </span>

                      <span className="text-xs font-black bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full">
                        10%
                      </span>
                    </div>

                    <p className="text-xs text-white/60">
                      You earn{' '}
                      <span className="text-white font-bold">
                        90% net revenue
                      </span>{' '}
                      from vote sales.
                    </p>

                    <div className="pt-2 flex justify-between text-xs font-bold text-white/80 border-t border-orange-500/20">
                      <span>
                        1,000 Votes:
                      </span>

                      <span className="text-orange-400 font-black">
                        $
                        {(
                          1000 *
                          baseVotePrice *
                          0.9
                        ).toFixed(
                          2
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">

                    <button
                      onClick={() =>
                        setWizardStep(
                          1
                        )
                      }
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-xs"
                    >
                      Back
                    </button>

                    <button
                      onClick={() =>
                        setWizardStep(
                          3
                        )
                      }
                      className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2"
                    >
                      Next: Contestants
                      <ArrowRight
                        size={16}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 */}

              {wizardStep === 3 && (
                <div className="space-y-6">

                  <div className="flex items-center justify-between">

                    <div>
                      <h3 className="text-xl font-black uppercase text-orange-400">
                        Step 3: Add Contestants
                      </h3>

                      <p className="text-xs text-white/40">
                        Add contestant numbers,
                        photos, and names.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleAddDraftCandidate
                      }
                      className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-1"
                    >
                      <Plus
                        size={14}
                      />
                      Add
                    </button>
                  </div>

                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1 no-scrollbar">

                    {draftCandidates.map(
                      (
                        candidate,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                          className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3"
                        >

                          <div className="flex items-center justify-between">

                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                              Candidate #
                              {index +
                                1}
                            </span>

                            {draftCandidates.length >
                              1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveDraftCandidate(
                                    index
                                  )
                                }
                                className="text-red-400 hover:text-red-300 p-1"
                              >
                                <Trash2
                                  size={
                                    14
                                  }
                                />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                            <input
                              type="text"
                              placeholder="#01"
                              className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-orange-500"
                              value={
                                candidate.contestantNumber
                              }
                              onChange={e =>
                                handleDraftCandidateChange(
                                  index,
                                  'contestantNumber',
                                  e.target.value
                                )
                              }
                            />

                            <input
                              type="text"
                              placeholder="Contestant Name *"
                              className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-orange-500 sm:col-span-2"
                              value={
                                candidate.name
                              }
                              onChange={e =>
                                handleDraftCandidateChange(
                                  index,
                                  'name',
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <input
                            type="text"
                            placeholder="Short Bio / County / Specialty"
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-orange-500"
                            value={
                              candidate.description
                            }
                            onChange={e =>
                              handleDraftCandidateChange(
                                index,
                                'description',
                                e.target.value
                              )
                            }
                          />

                          <DeviceImagePicker
                            label="Contestant Photo"
                            value={
                              candidate.imageUrl
                            }
                            onChange={value =>
                              handleDraftCandidateChange(
                                index,
                                'imageUrl',
                                value
                              )
                            }
                            presetCategory="contestant"
                          />
                        </div>
                      )
                    )}
                  </div>

                  <div className="pt-4 flex justify-between">

                    <button
                      onClick={() =>
                        setWizardStep(
                          2
                        )
                      }
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-xs"
                    >
                      Back
                    </button>

                    <button
                      onClick={() => {
                        const valid =
                          draftCandidates.some(
                            candidate =>
                              candidate.name.trim()
                                .length >
                              0
                          );

                        if (!valid) {
                          toast.error(
                            'Add at least one contestant.'
                          );
                          return;
                        }

                        setWizardStep(
                          4
                        );
                      }}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2"
                    >
                      Next: Publish
                      <ArrowRight
                        size={16}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}

              {wizardStep === 4 && (
                <div className="space-y-6">

                  <h3 className="text-xl font-black uppercase text-orange-400">
                    Step 4: Public Settings & Publish
                  </h3>

                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between gap-4">

                    <div>
                      <p className="text-sm font-black uppercase">
                        Public Live Leaderboard
                      </p>

                      <p className="text-xs text-white/40">
                        Show live vote rankings.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowLiveLeaderboard(
                          prev =>
                            !prev
                        )
                      }
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative p-1',

                        showLiveLeaderboard
                          ? 'bg-orange-600'
                          : 'bg-white/20'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full bg-white transition-transform',

                          showLiveLeaderboard
                            ? 'translate-x-6'
                            : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>

                  <div className="bg-black/50 border border-white/10 p-5 rounded-2xl space-y-2 text-xs">

                    <p className="font-black text-orange-400 uppercase tracking-widest">
                      Competition Review
                    </p>

                    <p>
                      <span className="text-white/40">
                        Title:
                      </span>{' '}
                      <strong>
                        {compTitle ||
                          'Untitled'}
                      </strong>
                    </p>

                    <p>
                      <span className="text-white/40">
                        Event:
                      </span>{' '}
                      {associatedEvent ||
                        'None'}
                    </p>

                    <p>
                      <span className="text-white/40">
                        Base Price:
                      </span>{' '}
                      $
                      {baseVotePrice.toFixed(
                        2
                      )}
                    </p>

                    <p>
                      <span className="text-white/40">
                        Contestants:
                      </span>{' '}
                      {
                        draftCandidates.filter(
                          candidate =>
                            candidate.name.trim()
                              .length >
                            0
                        ).length
                      }
                    </p>
                  </div>

                  <div className="pt-4 flex justify-between">

                    <button
                      onClick={() =>
                        setWizardStep(
                          3
                        )
                      }
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-xs"
                    >
                      Back
                    </button>

                    <button
                      onClick={
                        handlePublishCompetition
                      }
                      className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-600/20"
                    >
                      🚀 Publish Competition
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* ADD CONTESTANT MODAL */}
      {/* ================================================================ */}

      <AnimatePresence>
        {addContestantComp && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">

            <motion.div
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              onClick={() =>
                setAddContestantComp(
                  null
                )
              }
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0
              }}
              animate={{
                scale: 1,
                opacity: 1
              }}
              exit={{
                scale: 0.9,
                opacity: 0
              }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
            >

              <button
                onClick={() =>
                  setAddContestantComp(
                    null
                  )
                }
                className="absolute top-6 right-6 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="mb-6">

                <p className="text-xs font-black uppercase text-orange-400 tracking-widest">
                  Organizer Action
                </p>

                <h3 className="text-2xl font-black uppercase tracking-tighter">
                  Add Contestant
                </h3>

                <p className="text-white/40 text-xs">
                  To &quot;
                  {
                    addContestantComp.title
                  }
                  &quot;
                </p>
              </div>

              <form
                onSubmit={
                  handleAddContestantToExisting
                }
                className="space-y-4"
              >

                <div className="grid grid-cols-3 gap-3">

                  <input
                    type="text"
                    placeholder="#01"
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500"
                    value={
                      newCandidateNumber
                    }
                    onChange={e =>
                      setNewCandidateNumber(
                        e.target.value
                      )
                    }
                  />

                  <input
                    type="text"
                    placeholder="Contestant Name *"
                    required
                    className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500"
                    value={
                      newCandidateName
                    }
                    onChange={e =>
                      setNewCandidateName(
                        e.target.value
                      )
                    }
                  />
                </div>

                <input
                  type="text"
                  placeholder="Short Bio / Specialty"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500"
                  value={
                    newCandidateDesc
                  }
                  onChange={e =>
                    setNewCandidateDesc(
                      e.target.value
                    )
                  }
                />

                <DeviceImagePicker
                  label="Contestant Photo"
                  value={
                    newCandidateImage
                  }
                  onChange={
                    setNewCandidateImage
                  }
                  presetCategory="contestant"
                />

                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20"
                >
                  Confirm Add Contestant
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* VOTING MODAL */}
      {/* ================================================================ */}

      <AnimatePresence>
        {votingTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">

            <motion.div
              initial={{
                opacity: 0
              }}
              animate={{
                opacity: 1
              }}
              exit={{
                opacity: 0
              }}
              onClick={() =>
                !isProcessingVote &&
                setVotingTarget(
                  null
                )
              }
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{
                scale: 0.9,
                opacity: 0,
                y: 20
              }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0
              }}
              exit={{
                scale: 0.9,
                opacity: 0,
                y: 20
              }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
            >

              <button
                onClick={() =>
                  setVotingTarget(
                    null
                  )
                }
                disabled={
                  isProcessingVote
                }
                className="absolute top-6 right-6 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>

              {!voteSuccess ? (
                <div>

                  <div className="flex items-center gap-4 mb-6">

                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-orange-500/30">
                      <img
                        src={
                          votingTarget
                            .candidate
                            .imageUrl
                        }
                        alt={
                          votingTarget
                            .candidate
                            .name
                        }
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>

                      <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest block">
                        Cast Vote
                      </span>

                      <h3 className="text-2xl font-black uppercase tracking-tighter">
                        {
                          votingTarget
                            .candidate
                            .name
                        }
                      </h3>

                      <p className="text-xs text-white/40">
                        {
                          votingTarget
                            .comp
                            .title
                        }
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-6 space-y-3">

                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                      Select Vote Package
                    </label>

                    <div className="grid grid-cols-2 gap-2.5">

                      {(
                        votingTarget
                          .comp
                          .votePackages || [
                          {
                            votes: 1,
                            price: 0.5
                          },
                          {
                            votes: 5,
                            price: 2.5
                          },
                          {
                            votes: 10,
                            price: 5,
                            discountLabel:
                              'Popular'
                          },
                          {
                            votes: 25,
                            price: 12.5,
                            discountLabel:
                              'Best Value'
                          },
                          {
                            votes: 50,
                            price: 25,
                            discountLabel:
                              'VIP'
                          },
                          {
                            votes: 100,
                            price: 50,
                            discountLabel:
                              'Mega'
                          }
                        ]
                      ).map(
                        (
                          pkg,
                          index
                        ) => (
                          <button
                            key={
                              index
                            }
                            type="button"
                            onClick={() =>
                              setSelectedVotePackage(
                                pkg
                              )
                            }
                            className={cn(
                              'p-3 rounded-2xl font-black text-xs transition-all border text-left',

                              selectedVotePackage.votes ===
                                pkg.votes
                                ? 'bg-orange-600 text-white border-orange-500'
                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                            )}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-black">
                                {
                                  pkg.votes
                                }{' '}
                                Votes
                              </span>

                              {pkg.discountLabel && (
                                <span className="text-[9px] text-orange-300">
                                  {
                                    pkg.discountLabel
                                  }
                                </span>
                              )}
                            </div>

                            <span className="text-xs font-black text-orange-300">
                              $
                              {pkg.price.toFixed(
                                2
                              )}
                            </span>
                          </button>
                        )
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-3 text-sm font-black border-t border-white/10">

                      <span className="text-white/60">
                        Total:
                      </span>

                      <span className="text-2xl text-orange-400">
                        $
                        {selectedVotePackage.price.toFixed(
                          2
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">

                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                      Payment Method
                    </label>

                    <div className="grid grid-cols-2 gap-3">

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            'orange_money'
                          )
                        }
                        className={cn(
                          'p-3 rounded-2xl border text-left flex items-center gap-3',

                          paymentMethod ===
                            'orange_money'
                            ? 'bg-orange-600/20 border-orange-500'
                            : 'bg-white/5 border-white/10'
                        )}
                      >
                        <Smartphone
                          size={18}
                          className="text-orange-500"
                        />

                        <span className="text-xs font-bold">
                          Orange Money
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            'mtn_momo'
                          )
                        }
                        className={cn(
                          'p-3 rounded-2xl border text-left flex items-center gap-3',

                          paymentMethod ===
                            'mtn_momo'
                            ? 'bg-yellow-500/20 border-yellow-500'
                            : 'bg-white/5 border-white/10'
                        )}
                      >
                        <Smartphone
                          size={18}
                          className="text-yellow-500"
                        />

                        <span className="text-xs font-bold">
                          MTN MoMo
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            'wallet'
                          )
                        }
                        className={cn(
                          'p-3 rounded-2xl border text-left flex items-center gap-3',

                          paymentMethod ===
                            'wallet'
                            ? 'bg-green-500/20 border-green-500'
                            : 'bg-white/5 border-white/10'
                        )}
                      >
                        <Wallet
                          size={18}
                          className="text-green-500"
                        />

                        <span className="text-xs font-bold">
                          Swift Wallet
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            'card'
                          )
                        }
                        className={cn(
                          'p-3 rounded-2xl border text-left flex items-center gap-3',

                          paymentMethod ===
                            'card'
                            ? 'bg-blue-500/20 border-blue-500'
                            : 'bg-white/5 border-white/10'
                        )}
                      >
                        <CreditCard
                          size={18}
                          className="text-blue-500"
                        />

                        <span className="text-xs font-bold">
                          Card
                        </span>
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Voter Name"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs focus:outline-none focus:border-orange-500"
                      value={
                        voterName
                      }
                      onChange={e =>
                        setVoterName(
                          e.target.value
                        )
                      }
                    />

                    <input
                      type="tel"
                      placeholder="+231 77 000 0000"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 text-xs focus:outline-none focus:border-orange-500"
                      value={
                        voterPhone
                      }
                      onChange={e =>
                        setVoterPhone(
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <button
                    onClick={
                      handleConfirmVotePayment
                    }
                    disabled={
                      isProcessingVote
                    }
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2"
                  >
                    {isProcessingVote ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck
                          size={18}
                        />
                        Confirm $
                        {selectedVotePackage.price.toFixed(
                          2
                        )}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-6">

                  <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                    <CheckCircle2
                      size={40}
                    />
                  </div>

                  <div>
                    <span className="text-xs font-black uppercase tracking-widest text-green-400 block mb-1">
                      Votes Credited
                    </span>

                    <h3 className="text-3xl font-black uppercase tracking-tighter">
                      Payment Confirmed!
                    </h3>

                    <p className="text-white/60 text-sm mt-2">
                      You successfully
                      cast{' '}
                      <strong className="text-orange-400">
                        {
                          selectedVotePackage.votes
                        }{' '}
                        votes
                      </strong>{' '}
                      for{' '}
                      <strong className="text-white">
                        {
                          votingTarget
                            .candidate
                            .name
                        }
                      </strong>
                      .
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-left">

                    <div className="flex justify-between">
                      <span className="text-white/60">
                        Transaction:
                      </span>

                      <span className="font-mono text-white">
                        {
                          lastTxRef
                        }
                      </span>
                    </div>

                    <div className="flex justify-between mt-2">
                      <span className="text-white/60">
                        Payment:
                      </span>

                      <span className="text-orange-400 uppercase">
                        {
                          paymentMethod.replace(
                            '_',
                            ' '
                          )
                        }
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setVotingTarget(
                        null
                      )
                    }
                    className="w-full bg-white/10 hover:bg-white/20 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}