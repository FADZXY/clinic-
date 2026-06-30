import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ActivePatient {
  id: number;
  name: string;
}

interface ClinicContextType {
  activePatient: ActivePatient | null;
  setActivePatient: (patient: ActivePatient | null) => void;
  bookingModalOpen: boolean;
  openBookingModal: () => void;
  closeBookingModal: () => void;
  bookingPatient: ActivePatient | null;
  setBookingPatient: (patient: ActivePatient | null) => void;
}

const ClinicContext = createContext<ClinicContextType | null>(null);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [activePatient, setActivePatient] = useState<ActivePatient | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingPatient, setBookingPatient] = useState<ActivePatient | null>(null);

  const openBookingModal = useCallback(() => setBookingModalOpen(true), []);
  const closeBookingModal = useCallback(() => setBookingModalOpen(false), []);

  return (
    <ClinicContext.Provider value={{
      activePatient, setActivePatient,
      bookingModalOpen, openBookingModal, closeBookingModal,
      bookingPatient, setBookingPatient,
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic(): ClinicContextType {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic must be used within ClinicProvider");
  return ctx;
}
