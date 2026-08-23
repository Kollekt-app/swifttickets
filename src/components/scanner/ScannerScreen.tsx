import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  motion,
  AnimatePresence,
} from "motion/react";

import {
  CheckCircle2,
  AlertCircle,
  Users,
  ArrowLeft,
  Scan,
  RefreshCw,
} from "lucide-react";

import {
  Html5QrcodeScanner,
} from "html5-qrcode";

import {
  UserProfile,
  Event,
} from "../../types";


// ============================================================
// TYPES
// ============================================================

type ScanResult = {
  valid?: boolean;

  status?:
    | string
    | "VALID"
    | "ALREADY_SCANNED"
    | "INVALID"
    | "REFUNDED"
    | "TRANSFERRED"
    | "WRONG_EVENT"
    | "duplicate"
    | "success"
    | "error";

  message?: string;

  ticketCode?: string;

  attendeeName?: string;

  ticketType?: string;

  eventTitle?: string;

  eventDate?: string;

  eventLocation?: string;

  organizerName?: string;

  scannedAt?: string | null;

  scannedGate?: string | null;

  liveCount?: number;

  scannedCount?: number;

  totalScanned?: number;

  totalTickets?: number;

  error?: string;
};


// ============================================================
// COMPONENT
// ============================================================

export default function ScannerScreen({
  user,
  event,
  gate,
}: {
  user: UserProfile | null;
  event: Event | null;
  gate: string;
}) {
  const navigate = useNavigate();

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [scanResult, setScanResult] =
    useState<ScanResult | null>(null);

  const [liveCount, setLiveCount] =
    useState<number>(0);

  const [isScanning, setIsScanning] =
    useState<boolean>(true);

  const [isRefreshing, setIsRefreshing] =
    useState<boolean>(false);

  // ----------------------------------------------------------
  // REFS
  // ----------------------------------------------------------

  const scannerRef =
    useRef<Html5QrcodeScanner | null>(null);

  const lastScanTime =
    useRef<number>(0);

  const isProcessingScan =
    useRef<boolean>(false);

  const resetTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const DEBOUNCE_TIME = 2000;


  // ==========================================================
  // PLAY SOUND
  // ==========================================================
  //
  // No external MP3 files.
  // This prevents:
  //
  // NotSupportedError:
  // Failed to load because no supported source was found.
  //
  // ==========================================================

  const playSound = useCallback(
    (type: "success" | "error") => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;

        if (!AudioContextClass) {
          return;
        }

        const audioContext =
          new AudioContextClass();

        const oscillator =
          audioContext.createOscillator();

        const gainNode =
          audioContext.createGain();

        oscillator.connect(gainNode);

        gainNode.connect(
          audioContext.destination
        );

        if (type === "success") {
          oscillator.frequency.value = 880;

          gainNode.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
          );

          gainNode.gain.exponentialRampToValueAtTime(
            0.25,
            audioContext.currentTime + 0.01
          );

          gainNode.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + 0.18
          );

          oscillator.start();

          oscillator.stop(
            audioContext.currentTime + 0.2
          );
        } else {
          oscillator.frequency.value = 220;

          gainNode.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
          );

          gainNode.gain.exponentialRampToValueAtTime(
            0.25,
            audioContext.currentTime + 0.01
          );

          gainNode.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + 0.3
          );

          oscillator.start();

          oscillator.stop(
            audioContext.currentTime + 0.3
          );
        }

        oscillator.addEventListener(
          "ended",
          () => {
            audioContext.close().catch(() => {});
          }
        );
      } catch (error) {
        console.log(
          "Audio error:",
          error
        );
      }
    },
    []
  );


  // ==========================================================
  // VIBRATION
  // ==========================================================

  const triggerVibration = useCallback(
    (type: "success" | "error") => {
      try {
        if (
          typeof navigator !== "undefined" &&
          "vibrate" in navigator
        ) {
          if (type === "success") {
            navigator.vibrate(100);
          } else {
            navigator.vibrate([
              100,
              50,
              100,
            ]);
          }
        }
      } catch {
        // Ignore vibration errors.
      }
    },
    []
  );


  // ==========================================================
  // LOAD SCANNED COUNT
  // ==========================================================

  const refreshScannedCount =
    useCallback(async () => {
      if (!event?.id) {
        return;
      }

      try {
        setIsRefreshing(true);

        console.log(
          "REFRESHING SCANNED COUNT FOR EVENT:",
          event.id
        );

        const response = await fetch(
          `/api/events/${encodeURIComponent(
            event.id
          )}/gate-manifest`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Manifest request failed: ${response.status}`
          );
        }

        const manifest =
          await response.json();

        console.log(
          "GATE MANIFEST:",
          manifest
        );

        const tickets =
          Array.isArray(manifest?.tickets)
            ? manifest.tickets
            : [];

        const scannedTickets =
          tickets.filter(
            (ticket: any) =>
              String(
                ticket?.status || ""
              ).toLowerCase() ===
              "scanned"
          );

        const count =
          scannedTickets.length;

        console.log(
          "SCANNED TICKETS:",
          count
        );

        setLiveCount(count);
      } catch (error) {
        console.error(
          "Failed to refresh scanned count:",
          error
        );
      } finally {
        setIsRefreshing(false);
      }
    }, [event?.id]);


  // ==========================================================
  // INITIAL COUNT
  // ==========================================================

  useEffect(() => {
    if (!event?.id) {
      return;
    }

    refreshScannedCount();
  }, [
    event?.id,
    refreshScannedCount,
  ]);


  // ==========================================================
  // AUTO REFRESH COUNT
  // ==========================================================

  useEffect(() => {
    if (!event?.id) {
      return;
    }

    const interval =
      setInterval(() => {
        refreshScannedCount();
      }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [
    event?.id,
    refreshScannedCount,
  ]);


  // ==========================================================
  // SCAN SUCCESS
  // ==========================================================

  const onScanSuccess =
    useCallback(
      async (decodedText: string) => {
        // Prevent duplicate callback execution.
        if (isProcessingScan.current) {
          return;
        }

        const now = Date.now();

        if (
          now - lastScanTime.current <
          DEBOUNCE_TIME
        ) {
          return;
        }

        lastScanTime.current = now;

        isProcessingScan.current = true;

        setIsScanning(false);

        const ticketCode =
          decodedText.trim();

        console.log(
          "================================================"
        );

        console.log(
          "SCANNING TICKET:",
          ticketCode
        );

        console.log(
          "EVENT:",
          event?.id
        );

        console.log(
          "GATE:",
          gate
        );

        console.log(
          "================================================"
        );

        try {
          if (!ticketCode) {
            throw new Error(
              "Empty QR code"
            );
          }

          if (!event?.id) {
            throw new Error(
              "No event selected"
            );
          }

          // --------------------------------------------------
          // SEND SCAN TO SERVER
          // --------------------------------------------------

          const response =
            await fetch(
              "/api/scanner/scan",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                body: JSON.stringify({
                  ticketCode,
                  eventId: event.id,
                  gate,
                }),
              }
            );

          // --------------------------------------------------
          // READ RESPONSE SAFELY
          // --------------------------------------------------

          let data: ScanResult;

          try {
            data =
              await response.json();
          } catch {
            data = {
              status: "error",
              message:
                "Server returned an invalid response.",
            };
          }

          console.log(
            "SCANNER RESPONSE:",
            data
          );

          // --------------------------------------------------
          // HTTP ERROR
          // --------------------------------------------------

          if (!response.ok) {
            const errorMessage =
              data?.message ||
              data?.error ||
              `Scanner request failed (${response.status})`;

            setScanResult({
              ...data,
              status:
                data?.status ||
                "error",
              valid: false,
              message:
                errorMessage,
            });

            playSound("error");

            triggerVibration("error");

            // Still refresh the count.
            await refreshScannedCount();

            return;
          }

          // --------------------------------------------------
          // DETERMINE SUCCESS
          // --------------------------------------------------
          //
          // Your server returns:
          //
          // {
          //   valid: true,
          //   status: "VALID"
          // }
          //
          // NOT:
          //
          // status: "success"
          //
          // --------------------------------------------------

          const normalizedStatus =
            String(
              data?.status || ""
            ).toUpperCase();

          const successfulScan =
            data?.valid === true &&
            (
              normalizedStatus ===
                "VALID" ||
              normalizedStatus ===
                "SUCCESS" ||
              normalizedStatus ===
                "SCANNED"
            );

          const alreadyScanned =
            normalizedStatus ===
              "ALREADY_SCANNED" ||
            normalizedStatus ===
              "DUPLICATE";

          const wrongEvent =
            normalizedStatus ===
              "WRONG_EVENT";

          // --------------------------------------------------
          // SHOW RESULT
          // --------------------------------------------------

          setScanResult(data);

          if (successfulScan) {
            console.log(
              "TICKET SCAN SUCCESS"
            );

            playSound("success");

            triggerVibration(
              "success"
            );

            // ------------------------------------------------
            // IMPORTANT:
            // Get the NEW scanned count from database.
            // ------------------------------------------------

            await refreshScannedCount();
          } else {
            console.log(
              "TICKET SCAN NOT SUCCESSFUL:",
              normalizedStatus
            );

            playSound("error");

            triggerVibration(
              "error"
            );

            // Refresh anyway because this could
            // be an already-scanned ticket.
            await refreshScannedCount();
          }

          // Avoid unused variable warnings in some
          // TypeScript configurations.
          void alreadyScanned;
          void wrongEvent;

        } catch (error: any) {
          console.error(
            "Scanner request error:",
            error
          );

          setScanResult({
            status: "error",
            valid: false,
            message:
              error?.message ||
              "Network error. Please try again.",
          });

          playSound("error");

          triggerVibration(
            "error"
          );

          await refreshScannedCount();

        } finally {
          // --------------------------------------------------
          // RESET SCANNER AFTER 3 SECONDS
          // --------------------------------------------------

          if (
            resetTimerRef.current
          ) {
            clearTimeout(
              resetTimerRef.current
            );
          }

          resetTimerRef.current =
            setTimeout(() => {
              setScanResult(null);

              setIsScanning(true);

              isProcessingScan.current =
                false;

              lastScanTime.current =
                Date.now();

              resetTimerRef.current =
                null;
            }, 3000);
        }
      },
      [
        event?.id,
        gate,
        playSound,
        refreshScannedCount,
        triggerVibration,
      ]
    );


  // ==========================================================
  // SCAN FAILURE
  // ==========================================================

  const onScanFailure =
    useCallback(
      (_error: any) => {
        // html5-qrcode calls this constantly
        // while looking for a QR code.
        //
        // Do not log it because it would flood
        // the browser console.
      },
      []
    );


  // ==========================================================
  // INITIALIZE QR SCANNER
  // ==========================================================

  useEffect(() => {
    if (!event || !gate) {
      navigate(
        "/scanner/events"
      );

      return;
    }

    // Wait for DOM element to exist.
    const timer =
      setTimeout(() => {
        try {
          // Make sure another scanner
          // isn't already attached.
          if (scannerRef.current) {
            scannerRef.current
              .clear()
              .catch(() => {});

            scannerRef.current =
              null;
          }

          console.log(
            "INITIALIZING QR SCANNER"
          );

          const scanner =
            new Html5QrcodeScanner(
              "qr-reader",
              {
                fps: 10,

                qrbox: {
                  width: 250,
                  height: 250,
                },

                rememberLastUsedCamera:
                  true,

                showTorchButtonIfSupported:
                  true,

                showZoomSliderIfSupported:
                  true,

                aspectRatio: 1,
              },
              false
            );

          scanner.render(
            onScanSuccess,
            onScanFailure
          );

          scannerRef.current =
            scanner;

        } catch (error) {
          console.error(
            "Failed to initialize scanner:",
            error
          );
        }
      }, 100);

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {
      clearTimeout(timer);

      if (
        resetTimerRef.current
      ) {
        clearTimeout(
          resetTimerRef.current
        );

        resetTimerRef.current =
          null;
      }

      isProcessingScan.current =
        false;

      if (scannerRef.current) {
        const scanner =
          scannerRef.current;

        scannerRef.current =
          null;

        scanner
          .clear()
          .catch((error) => {
            console.log(
              "Scanner cleanup:",
              error
            );
          });
      }
    };
  }, [
    event,
    gate,
    navigate,
    onScanSuccess,
    onScanFailure,
  ]);


  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusColor =
    (result: ScanResult | null) => {
      if (!result) {
        return "bg-black";
      }

      const status =
        String(
          result.status || ""
        ).toUpperCase();

      if (
        result.valid === true &&
        (
          status === "VALID" ||
          status === "SUCCESS" ||
          status === "SCANNED"
        )
      ) {
        return "bg-green-500";
      }

      if (
        status ===
          "WRONG_EVENT"
      ) {
        return "bg-yellow-500";
      }

      return "bg-red-500";
    };


  // ==========================================================
  // RESULT TITLE
  // ==========================================================

  const getResultTitle =
    (result: ScanResult | null) => {
      if (!result) {
        return "";
      }

      const status =
        String(
          result.status || ""
        ).toUpperCase();

      if (
        result.valid === true &&
        (
          status === "VALID" ||
          status === "SUCCESS" ||
          status === "SCANNED"
        )
      ) {
        return "Valid Ticket";
      }

      if (
        status ===
          "ALREADY_SCANNED" ||
        status ===
          "DUPLICATE"
      ) {
        return "Already Used";
      }

      if (
        status ===
          "WRONG_EVENT"
      ) {
        return "Wrong Event";
      }

      if (
        status ===
          "REFUNDED"
      ) {
        return "Refunded";
      }

      if (
        status ===
          "TRANSFERRED"
      ) {
        return "Transferred";
      }

      return "Invalid Ticket";
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* ====================================================
          HEADER
          ==================================================== */}

      <div className="p-6 flex items-center justify-between bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">

        <div className="flex items-center gap-4">

          <button
            onClick={() =>
              navigate(
                "/scanner/events"
              )
            }
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            type="button"
          >
            <ArrowLeft
              size={20}
            />
          </button>

          <div>

            <h2 className="text-sm font-black uppercase tracking-widest text-orange-500 leading-none mb-1">
              {gate}
            </h2>

            <h1 className="text-lg font-black uppercase tracking-tighter leading-none">
              {event?.title}
            </h1>

          </div>

        </div>


        {/* SCANNED COUNT */}

        <button
          type="button"
          onClick={
            refreshScannedCount
          }
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full transition-colors"
        >

          <Users
            size={16}
            className="text-orange-500"
          />

          <span className="text-sm font-black tracking-tighter">
            {liveCount}
          </span>

          <RefreshCw
            size={13}
            className={
              isRefreshing
                ? "animate-spin text-white/50"
                : "text-white/30"
            }
          />

        </button>

      </div>


      {/* ====================================================
          SCANNER AREA
          ==================================================== */}

      <div className="flex-1 relative flex flex-col items-center justify-center p-6">

        <div className="w-full max-w-sm aspect-square bg-white/5 rounded-[3rem] overflow-hidden border-2 border-white/10 relative">

          {/* HTML5 QR SCANNER */}

          <div
            id="qr-reader"
            className="w-full h-full"
          />

          {/* CUSTOM OVERLAY */}

          <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">

            <div className="w-full h-full border-2 border-orange-500/50 rounded-2xl relative">

              {/* TOP LEFT */}

              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-xl" />

              {/* TOP RIGHT */}

              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-xl" />

              {/* BOTTOM LEFT */}

              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-xl" />

              {/* BOTTOM RIGHT */}

              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-xl" />


              {/* SCANNING LINE */}

              {isScanning && (
                <motion.div
                  animate={{
                    top: [
                      "10%",
                      "90%",
                      "10%",
                    ],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                  }}
                  className="absolute left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)]"
                />
              )}

            </div>

          </div>

        </div>


        {/* INSTRUCTIONS */}

        <div className="mt-8 text-center">

          <div className="flex items-center justify-center gap-2 text-white/40 mb-2">

            <Scan
              size={16}
            />

            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {isScanning
                ? "Position QR Code in Frame"
                : "Verifying Ticket..."}
            </span>

          </div>

          <p className="text-sm text-white/60">
            Scanning for{" "}
            {event?.title}{" "}
            at{" "}
            {gate}
          </p>

        </div>


        {/* MANUAL REFRESH */}

        <button
          type="button"
          onClick={
            refreshScannedCount
          }
          disabled={isRefreshing}
          className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
        >

          <RefreshCw
            size={14}
            className={
              isRefreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh attendance

        </button>

      </div>


      {/* ====================================================
          RESULT OVERLAY
          ==================================================== */}

      <AnimatePresence>

        {scanResult && (

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
            }}
            className={`fixed inset-0 z-[100] flex items-center justify-center p-6 ${getStatusColor(
              scanResult
            )}`}
          >

            <div className="text-center text-white space-y-6 max-w-xs">

              {/* ICON */}

              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">

                {scanResult.valid ===
                  true &&
                (
                  String(
                    scanResult.status ||
                      ""
                  ).toUpperCase() ===
                    "VALID" ||
                  String(
                    scanResult.status ||
                      ""
                  ).toUpperCase() ===
                    "SUCCESS" ||
                  String(
                    scanResult.status ||
                      ""
                  ).toUpperCase() ===
                    "SCANNED"
                ) ? (

                  <CheckCircle2
                    size={64}
                  />

                ) : (

                  <AlertCircle
                    size={64}
                  />

                )}

              </div>


              {/* TITLE */}

              <div className="space-y-2">

                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">
                  {getResultTitle(
                    scanResult
                  )}
                </h2>

                <p className="text-white/80 font-bold uppercase tracking-widest text-sm">
                  {scanResult.message ||
                    "Ticket verification complete."}
                </p>

              </div>


              {/* ATTENDEE */}

              {scanResult.attendeeName && (

                <div className="bg-black/20 p-6 rounded-[2rem] space-y-1">

                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    Attendee
                  </p>

                  <p className="text-2xl font-black uppercase tracking-tighter">
                    {
                      scanResult.attendeeName
                    }
                  </p>

                  {scanResult.ticketType && (
                    <p className="text-sm font-bold opacity-60">
                      {
                        scanResult.ticketType
                      }
                    </p>
                  )}

                </div>

              )}


              {/* TICKET CODE */}

              {scanResult.ticketCode && (

                <div className="text-xs font-mono opacity-50">
                  {
                    scanResult.ticketCode
                  }
                </div>

              )}


              {/* GATE */}

              <div className="pt-4">

                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  Gate: {gate}
                </p>

              </div>


              {/* CURRENT COUNT */}

              <div className="pt-2">

                <div className="inline-flex items-center gap-2 bg-black/20 px-5 py-3 rounded-full">

                  <Users
                    size={16}
                  />

                  <span className="text-sm font-black">
                    {liveCount}
                  </span>

                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                    Scanned
                  </span>

                </div>

              </div>

            </div>

          </motion.div>

        )}

      </AnimatePresence>

    </div>
  );
}