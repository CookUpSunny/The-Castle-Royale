import React from "react";
import { Modal } from "react-native";
import PaywallScreen from "@/components/PaywallScreen";

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional context copy, for example which arena the player tapped. */
  featureLabel?: string;
}

export default function PaywallModal({ visible, onClose, featureLabel }: PaywallModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <PaywallScreen onClose={onClose} featureLabel={featureLabel} />
    </Modal>
  );
}
