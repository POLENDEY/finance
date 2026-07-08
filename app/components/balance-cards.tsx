"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCardAction,
  changeFinancePinAction,
  deleteCardAction,
  hideGrandNetWorthAction,
  lockCardAction,
  renameCardAction,
  setupFinancePinAction,
  transferBetweenCardsAction,
  updateCardHiddenAction,
  updateFinancePinRequiredAction,
  verifyFinancePinAction,
  type CardActionState,
} from "@/app/actions/cards";
import {
  cardThemeClasses,
  countVisibleCards,
  getVisibleGrandNetWorth,
} from "@/lib/finance/balance-cards";
import type { BalanceCard } from "@/lib/types/finance";

type BalanceCardsProps = {
  cards: BalanceCard[];
  unlockedCardIds: number[];
  grandNetWorthVisible: boolean;
  hasPin: boolean;
  pinRequired: boolean;
};

type PinTarget =
  | { type: "card"; cardId: number }
  | { type: "grand" };

const iconButtonClass =
  "rounded-lg border p-1 transition hover:bg-white sm:p-1.5 dark:hover:bg-zinc-900/60";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

export function BalanceCards({
  cards,
  unlockedCardIds,
  grandNetWorthVisible,
  hasPin,
  pinRequired,
}: BalanceCardsProps) {
  const router = useRouter();
  const [localUnlockedIds, setLocalUnlockedIds] = useState(unlockedCardIds);
  const [localGrandVisible, setLocalGrandVisible] = useState(grandNetWorthVisible);
  const [pinModal, setPinModal] = useState<{
    mode: "setup" | "verify";
    target: PinTarget;
  } | null>(null);
  const [transferFromId, setTransferFromId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    setLocalUnlockedIds(unlockedCardIds);
  }, [unlockedCardIds]);

  useEffect(() => {
    setLocalGrandVisible(grandNetWorthVisible);
  }, [grandNetWorthVisible]);

  function isCardVisible(card: BalanceCard) {
    if (!card.is_hidden) {
      return true;
    }
    if (!pinRequired) {
      return true;
    }
    return localUnlockedIds.includes(card.id);
  }

  function isGrandVisible() {
    if (!pinRequired) {
      return localGrandVisible;
    }
    return localGrandVisible;
  }

  function requestUnlock(target: PinTarget) {
    if (!pinRequired) {
      if (target.type === "card") {
        setLocalUnlockedIds((ids) =>
          ids.includes(target.cardId) ? ids : [...ids, target.cardId]
        );
      } else {
        setLocalGrandVisible(true);
      }
      return;
    }
    setPinModal({ mode: hasPin ? "verify" : "setup", target });
  }

  function handlePinSuccess(target: PinTarget) {
    if (target.type === "card") {
      setLocalUnlockedIds((ids) =>
        ids.includes(target.cardId) ? ids : [...ids, target.cardId]
      );
    } else {
      setLocalGrandVisible(true);
    }
    setPinModal(null);
    router.refresh();
  }

  function handleLockCard(cardId: number) {
    lockCardAction(cardId).then(() => {
      setLocalUnlockedIds((ids) => ids.filter((id) => id !== cardId));
      router.refresh();
    });
  }

  function handleHideGrand() {
    hideGrandNetWorthAction().then(() => {
      setLocalGrandVisible(false);
      router.refresh();
    });
  }

  function handleToggleCardVisibility(card: BalanceCard) {
    if (isCardVisible(card)) {
      handleLockCard(card.id);
    } else {
      requestUnlock({ type: "card", cardId: card.id });
    }
  }

  const scrollableCards = cards.length > 2;

  useEffect(() => {
    if (!scrollableCards) return;

    const el = scrollRef.current;
    if (!el) return;

    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      resizeObserver.disconnect();
    };
  }, [scrollableCards, cards.length, updateScrollButtons]);

  function scrollCards(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;

    const firstCard = el.firstElementChild as HTMLElement | null;
    const gap = 16;
    const isWide = window.matchMedia("(min-width: 640px)").matches;
    const cardWidth = firstCard?.offsetWidth ?? el.clientWidth;
    const cardsPerStep = isWide ? 2 : 1;
    const scrollAmount = cardWidth * cardsPerStep + gap * (cardsPerStep - 1);

    el.scrollBy({
      left: scrollAmount * (direction === "left" ? -1 : 1),
      behavior: "smooth",
    });
  }

  return (
    <>
      <section className="space-y-4">
        <GrandNetWorthBanner
          cards={cards}
          unlockedCardIds={localUnlockedIds}
          visible={isGrandVisible()}
          pinRequired={pinRequired}
          hasPin={hasPin}
          onToggleVisibility={() => {
            if (isGrandVisible()) {
              handleHideGrand();
            } else {
              requestUnlock({ type: "grand" });
            }
          }}
        />

        {scrollableCards ? (
          <div>
            <div className="relative">
              <button
                type="button"
                onClick={() => scrollCards("left")}
                disabled={!canScrollLeft}
                aria-label="Previous balance cards"
                className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-zinc-200 bg-white/90 p-2 text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:flex dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                <ChevronLeftIcon />
              </button>

              <div
                ref={scrollRef}
                className="-mx-6 flex touch-pan-x gap-4 overflow-x-auto overscroll-x-contain scroll-px-6 px-6 pb-2 motion-safe:scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {cards.map((card, index) => (
                  <div
                    key={card.id}
                    className={`w-full shrink-0 snap-start sm:w-[calc(50%-0.5rem)] ${index % 2 !== 0 ? "sm:snap-none" : ""}`}
                  >
                    <BalanceCardItem
                      card={card}
                      visible={isCardVisible(card)}
                      allCards={cards}
                      hasPin={hasPin}
                      pinRequired={pinRequired}
                      unlockedCardIds={localUnlockedIds}
                      transferOpen={transferFromId === card.id}
                      renaming={renamingId === card.id}
                      onToggleVisibility={() => handleToggleCardVisibility(card)}
                      onToggleTransfer={() =>
                        setTransferFromId((id) => (id === card.id ? null : card.id))
                      }
                      onToggleRename={() =>
                        setRenamingId((id) => (id === card.id ? null : card.id))
                      }
                      onTransferDone={() => {
                        setTransferFromId(null);
                        router.refresh();
                      }}
                      onRenameDone={() => {
                        setRenamingId(null);
                        router.refresh();
                      }}
                      onDeleteDone={() => router.refresh()}
                      canDelete={cards.length > 1}
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollCards("right")}
                disabled={!canScrollRight}
                aria-label="Next balance cards"
                className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-zinc-200 bg-white/90 p-2 text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:flex dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                <ChevronRightIcon />
              </button>
            </div>

            <div className="mt-3 flex justify-center gap-3 sm:hidden">
              <button
                type="button"
                onClick={() => scrollCards("left")}
                disabled={!canScrollLeft}
                aria-label="Previous balance cards"
                className="rounded-full border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                onClick={() => scrollCards("right")}
                disabled={!canScrollRight}
                aria-label="Next balance cards"
                className="rounded-full border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${cards.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}
          >
            {cards.map((card) => (
              <BalanceCardItem
                key={card.id}
                card={card}
                visible={isCardVisible(card)}
                allCards={cards}
                hasPin={hasPin}
                pinRequired={pinRequired}
                unlockedCardIds={localUnlockedIds}
                transferOpen={transferFromId === card.id}
                renaming={renamingId === card.id}
                onToggleVisibility={() => handleToggleCardVisibility(card)}
                onToggleTransfer={() =>
                  setTransferFromId((id) => (id === card.id ? null : card.id))
                }
                onToggleRename={() =>
                  setRenamingId((id) => (id === card.id ? null : card.id))
                }
                onTransferDone={() => {
                  setTransferFromId(null);
                  router.refresh();
                }}
                onRenameDone={() => {
                  setRenamingId(null);
                  router.refresh();
                }}
                onDeleteDone={() => router.refresh()}
                canDelete={cards.length > 1}
              />
            ))}
          </div>
        )}

        {showAddForm ? (
          <AddCardForm
            onCancel={() => setShowAddForm(false)}
            onSuccess={() => {
              setShowAddForm(false);
              router.refresh();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full rounded-2xl border-2 border-dashed border-zinc-300 px-4 py-4 text-sm font-medium text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-emerald-600 dark:hover:text-emerald-400"
          >
            + Add balance card
          </button>
        )}
      </section>

      {pinModal && (
        <PinModal
          mode={pinModal.mode}
          target={pinModal.target}
          onClose={() => setPinModal(null)}
          onSuccess={() => handlePinSuccess(pinModal.target)}
        />
      )}
    </>
  );
}

function BalanceCardItem({
  card,
  visible,
  allCards,
  hasPin,
  pinRequired,
  unlockedCardIds,
  transferOpen,
  renaming,
  onToggleVisibility,
  onToggleTransfer,
  onToggleRename,
  onTransferDone,
  onRenameDone,
  onDeleteDone,
  canDelete,
}: {
  card: BalanceCard;
  visible: boolean;
  allCards: BalanceCard[];
  hasPin: boolean;
  pinRequired: boolean;
  unlockedCardIds: number[];
  transferOpen: boolean;
  renaming: boolean;
  onToggleVisibility: () => void;
  onToggleTransfer: () => void;
  onToggleRename: () => void;
  onTransferDone: () => void;
  onRenameDone: () => void;
  onDeleteDone: () => void;
  canDelete: boolean;
}) {
  const theme = cardThemeClasses(card.color_theme);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 sm:p-5 ${theme.border} ${theme.bg}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <p className={`text-sm font-medium leading-snug ${theme.text}`}>{card.name}</p>

        <div className="flex shrink-0 gap-0.5 self-end sm:gap-1">
          {card.is_hidden && (
            <button
              type="button"
              onClick={onToggleVisibility}
              className={`${iconButtonClass} ${theme.button}`}
              aria-label={visible ? "Hide balance" : "Show balance"}
            >
              {visible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleRename}
            className={`${iconButtonClass} ${theme.button}`}
            aria-label="Rename card"
          >
            <PencilIcon />
          </button>
          {canDelete && (
            <DeleteCardButton cardId={card.id} onSuccess={onDeleteDone} />
          )}
        </div>
      </div>

      <div className="mt-3 sm:mt-2">
        <p className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {visible ? formatMoney(card.balance) : "••••••"}
        </p>
        <p className={`mt-1 text-[11px] leading-snug sm:text-xs ${theme.subtext}`}>
          {visible
            ? card.is_hidden
              ? "Protected balance — hide when done"
              : "Available for deposits & expenses"
            : pinRequired
              ? "Hidden — enter PIN to view"
              : "Hidden — tap eye to view"}
        </p>
      </div>

      {renaming && (
        <div className="mt-4 border-t border-white/40 pt-4 dark:border-zinc-800/70">
          <RenameCardForm
            cardId={card.id}
            currentName={card.name}
            onCancel={onToggleRename}
            onSuccess={onRenameDone}
          />
        </div>
      )}

      <CollapsibleSection
        borderClass="border-white/40 dark:border-zinc-800/70"
        buttonClass={`${theme.text} hover:bg-white/40 dark:hover:bg-zinc-900/40`}
        forceOpen={transferOpen}
      >
        <HideBalanceSetting
          cardId={card.id}
          isHidden={card.is_hidden}
          hasPin={hasPin}
        />

        <button
          type="button"
          onClick={onToggleTransfer}
          className={`text-sm font-medium underline-offset-2 hover:underline ${theme.text}`}
        >
          {transferOpen ? "Cancel transfer" : "Transfer to another card →"}
        </button>

        {transferOpen && (
          <TransferForm
            fromCard={card}
            targetCards={allCards.filter((c) => c.id !== card.id)}
            pinRequired={pinRequired}
            unlockedCardIds={unlockedCardIds}
            onSuccess={onTransferDone}
          />
        )}
      </CollapsibleSection>
    </div>
  );
}

function GrandNetWorthBanner({
  cards,
  unlockedCardIds,
  visible,
  pinRequired,
  hasPin,
  onToggleVisibility,
}: {
  cards: BalanceCard[];
  unlockedCardIds: number[];
  visible: boolean;
  pinRequired: boolean;
  hasPin: boolean;
  onToggleVisibility: () => void;
}) {
  const total = getVisibleGrandNetWorth(cards, unlockedCardIds);
  const visibleCount = countVisibleCards(cards, unlockedCardIds);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-100 p-4 sm:p-6 dark:border-emerald-900 dark:from-emerald-950/60 dark:to-teal-950/40">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Grand Net Worth
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            {visible ? formatMoney(total) : "••••••"}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-emerald-600/80 sm:text-xs dark:text-emerald-400/80">
            {visible
              ? `Total from ${visibleCount} visible ${visibleCount === 1 ? "card" : "cards"}`
              : pinRequired
                ? "Hidden — enter PIN to view"
                : "Hidden — tap eye to view"}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleVisibility}
          className={`${iconButtonClass} self-end border-emerald-300 text-emerald-700 hover:bg-emerald-100/60 sm:self-auto dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40`}
          aria-label={visible ? "Hide grand net worth" : "Show grand net worth"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      <CollapsibleSection
        borderClass="border-emerald-200/60 dark:border-emerald-900/60"
        buttonClass="text-emerald-700 hover:bg-emerald-100/50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
      >
        <FinancePinRequiredSetting pinRequired={pinRequired} hasPin={hasPin} />
        {hasPin && <ChangePinSetting />}
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({
  children,
  borderClass,
  buttonClass,
  forceOpen = false,
}: {
  children: React.ReactNode;
  borderClass: string;
  buttonClass: string;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
    }
  }, [forceOpen]);

  return (
    <div className={`mt-4 border-t ${borderClass}`}>
      {open && <div className="space-y-3 pt-4">{children}</div>}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-center rounded-lg py-2 transition ${buttonClass}`}
        aria-expanded={open}
        aria-label={open ? "Hide card options" : "Show card options"}
      >
        <ChevronDownIcon className={open ? "rotate-180" : ""} />
      </button>
    </div>
  );
}

function ChangePinSetting() {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, isPending] = useActionState(
    changeFinancePinAction,
    null as CardActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      setShowForm(false);
    }
  }, [state?.success]);

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="w-full rounded-xl border border-emerald-300/60 bg-white/60 px-3 py-2 text-left text-xs font-medium text-emerald-800 transition hover:bg-white dark:border-emerald-800 dark:bg-zinc-950/30 dark:text-emerald-300"
      >
        Change PIN
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl bg-white/60 p-3 dark:bg-zinc-950/30">
      {state?.error && (
        <p className="text-xs text-red-600 dark:text-red-300">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-300">{state.success}</p>
      )}
      <PinInput id="currentPin" name="currentPin" label="Current PIN" />
      <PinInput id="newPin" name="newPin" label="New PIN" />
      <PinInput id="confirmNewPin" name="confirmPin" label="Confirm new PIN" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Update PIN"}
        </button>
      </div>
    </form>
  );
}

function FinancePinRequiredSetting({
  pinRequired,
  hasPin,
}: {
  pinRequired: boolean;
  hasPin: boolean;
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateFinancePinRequiredAction,
    null as CardActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      setShowConfirmModal(false);
    }
  }, [state?.success]);

  return (
    <>
      <form id="finance-pin-form" action={formAction} className="space-y-2">
        <input type="hidden" name="pinRequired" value={pinRequired ? "false" : "true"} />
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3 py-2 dark:bg-zinc-950/30">
          <div>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Require PIN to view protected balances
            </p>
            <p className="text-[11px] text-zinc-500">
              {pinRequired
                ? "One PIN unlocks each card or total individually"
                : "Protected balances can be viewed without PIN"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (pinRequired) {
                setShowConfirmModal(true);
              } else {
                const form = document.getElementById("finance-pin-form") as HTMLFormElement;
                form?.requestSubmit();
              }
            }}
            disabled={isPending}
            className={`relative h-6 w-11 rounded-full transition disabled:opacity-60 ${
              pinRequired ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                pinRequired ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </form>

      {showConfirmModal && (
        <DisablePinModal
          hasPin={hasPin}
          formAction={formAction}
          isPending={isPending}
          error={state?.error}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </>
  );
}

function HideBalanceSetting({
  cardId,
  isHidden,
  hasPin,
}: {
  cardId: number;
  isHidden: boolean;
  hasPin: boolean;
}) {
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateCardHiddenAction,
    null as CardActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      setShowConfirmModal(false);
      router.refresh();
    }
  }, [state?.success, router]);

  function handleToggle() {
    if (isHidden) {
      setShowConfirmModal(true);
      return;
    }
    const form = document.getElementById(`hide-form-${cardId}`) as HTMLFormElement;
    form?.requestSubmit();
  }

  return (
    <>
      <form id={`hide-form-${cardId}`} action={formAction} className="space-y-2">
        <input type="hidden" name="cardId" value={cardId} />
        <input type="hidden" name="isHidden" value={isHidden ? "false" : "true"} />
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/60 px-3 py-2 dark:bg-zinc-950/30">
          <div>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Hide balance on this card
            </p>
            <p className="text-[11px] text-zinc-500">
              {isHidden ? "Balance is hidden" : "Balance is visible to everyone"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            className={`relative h-6 w-11 rounded-full transition disabled:opacity-60 ${
              isHidden ? "bg-violet-600" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                isHidden ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {state?.error && !showConfirmModal && (
          <p className="text-xs text-red-600 dark:text-red-300">{state.error}</p>
        )}
      </form>

      {showConfirmModal && (
        <DisableHideModal
          cardId={cardId}
          hasPin={hasPin}
          formAction={formAction}
          isPending={isPending}
          error={state?.error}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </>
  );
}

function DisableHideModal({
  cardId,
  hasPin,
  formAction,
  isPending,
  error,
  onClose,
}: {
  cardId: number;
  hasPin: boolean;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  error?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {hasPin ? "Enter your PIN" : "Show balance"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          {hasPin
            ? "Enter your PIN to make this card balance visible again."
            : "This card balance will no longer be hidden."}
        </p>
        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="isHidden" value="false" />
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}
          {hasPin && (
            <PinInput id={`show-pin-${cardId}`} name="pin" label="PIN" />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2.5 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm text-white disabled:opacity-60"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCardForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createCardAction,
    null as CardActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {state?.error && (
        <p className="mb-3 text-sm text-red-600 dark:text-red-300">{state.error}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="name"
          type="text"
          required
          placeholder="Card name (e.g. Emergency Fund)"
          className={inputClass}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Adding…" : "Add card"}
          </button>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          name="hideBalance"
          value="true"
          className="rounded border-zinc-300"
        />
        Hide balance on this card (uses your global PIN)
      </label>
    </form>
  );
}

function RenameCardForm({
  cardId,
  currentName,
  onCancel,
  onSuccess,
}: {
  cardId: number;
  currentName: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    renameCardAction,
    null as CardActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex gap-2">
      <input type="hidden" name="cardId" value={cardId} />
      <input
        name="name"
        type="text"
        required
        defaultValue={currentName}
        className={inputClass}
      />
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="shrink-0 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white dark:bg-zinc-200 dark:text-zinc-900"
      >
        Save
      </button>
    </form>
  );
}

function DeleteCardButton({
  cardId,
  onSuccess,
}: {
  cardId: number;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    deleteCardAction,
    null as CardActionState | null
  );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction}>
      <input type="hidden" name="cardId" value={cardId} />
      <button
        type="submit"
        disabled={isPending}
        onClick={(e) => {
          if (!confirm("Delete this card? It must have zero balance.")) {
            e.preventDefault();
          }
        }}
        className="rounded-lg border border-red-300/60 p-1.5 text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
        aria-label="Delete card"
      >
        <TrashIcon />
      </button>
    </form>
  );
}

function TransferForm({
  fromCard,
  targetCards,
  pinRequired,
  unlockedCardIds,
  onSuccess,
}: {
  fromCard: BalanceCard;
  targetCards: BalanceCard[];
  pinRequired: boolean;
  unlockedCardIds: number[];
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    transferBetweenCardsAction,
    null as CardActionState | null
  );
  const needsPin =
    pinRequired &&
    [fromCard, ...targetCards].some(
      (c) => c.is_hidden && !unlockedCardIds.includes(c.id)
    );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  if (targetCards.length === 0) {
    return (
      <p className="text-xs text-zinc-500">Add another card to transfer funds.</p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl bg-white/60 p-3 dark:bg-zinc-950/30">
      <input type="hidden" name="fromCardId" value={fromCard.id} />
      {state?.error && (
        <p className="text-xs text-red-600 dark:text-red-300">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-300">{state.success}</p>
      )}
      <select name="toCardId" required className={inputClass}>
        <option value="">Transfer to…</option>
        {targetCards.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className={`grid gap-2 ${needsPin ? "sm:grid-cols-2" : ""}`}>
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          placeholder="Amount"
          className={inputClass}
        />
        {needsPin && (
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="PIN"
            className={inputClass}
          />
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
      >
        {isPending ? "Transferring…" : "Transfer"}
      </button>
    </form>
  );
}

function DisablePinModal({
  hasPin,
  formAction,
  isPending,
  error,
  onClose,
}: {
  hasPin: boolean;
  formAction: (payload: FormData) => void;
  isPending: boolean;
  error?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {hasPin ? "Enter your PIN" : "Create a PIN to confirm"}
        </h3>
        <form action={formAction} className="mt-5 space-y-4">
          <input type="hidden" name="pinRequired" value="false" />
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}
          <PinInput id="disable-pin" name="pin" label={hasPin ? "PIN" : "New PIN"} />
          {!hasPin && (
            <PinInput id="disable-confirm-pin" name="confirmPin" label="Confirm PIN" />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2.5 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm text-white disabled:opacity-60"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PinModal({
  mode,
  target,
  onClose,
  onSuccess,
}: {
  mode: "setup" | "verify";
  target: PinTarget;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const action = mode === "setup" ? setupFinancePinAction : verifyFinancePinAction;
  const [state, formAction, isPending] = useActionState(action, null as CardActionState | null);
  const targetLabel =
    target.type === "grand" ? "grand net worth" : "this card balance";

  useEffect(() => {
    if (state?.unlocked) {
      onSuccess();
    }
  }, [state?.unlocked, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {mode === "setup" ? "Create your 6-digit PIN" : "Enter your PIN"}
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          {mode === "setup"
            ? `This PIN protects hidden balances. You'll unlock ${targetLabel} after saving.`
            : `Enter your PIN to view ${targetLabel}.`}
        </p>
        <form action={formAction} className="mt-5 space-y-4">
          {target.type === "card" ? (
            <input type="hidden" name="unlockCardId" value={target.cardId} />
          ) : (
            <input type="hidden" name="unlockGrand" value="true" />
          )}
          {state?.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {state.error}
            </div>
          )}
          <PinInput id="pin" name="pin" label={mode === "setup" ? "New PIN" : "PIN"} />
          {mode === "setup" && (
            <PinInput id="confirmPin" name="confirmPin" label="Confirm PIN" />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border px-4 py-2.5 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm text-white disabled:opacity-60"
            >
              {isPending ? "Checking…" : mode === "setup" ? "Save PIN" : "Unlock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PinInput({ id, name, label }: { id: string; name: string; label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        id={id}
        name={name}
        type="password"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        required
        placeholder="••••••"
        className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-center text-lg tracking-[0.4em] dark:border-zinc-700 dark:bg-zinc-950"
      />
    </label>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
