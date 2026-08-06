import { useEffect, useState, type SubmitEvent } from "react";
import "./CardsPage.css";
import type { Card } from "../../types/card";
import { cardsApi, householdsApi, type HouseholdMember } from "../../api/cards";
import { useToast } from "../../components/Toast/useToast";
import { useConfirm } from "../../components/ConfirmDialog/useConfirm";

export function CardsPage() {
    const [cards, setCards] = useState<Card[]>([]);
    const [members, setMembers] = useState<HouseholdMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [ownerUserId, setOwnerUserId] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const toast = useToast();
    const confirm = useConfirm();

    function memberName(userId: string) {
        return members.find((m) => m.id === userId)?.name ?? "—";
    }

    async function loadData() {
        try {
            setLoading(true);
            const [cardsData, membersData] = await Promise.all([
                cardsApi.list(),
                householdsApi.members(),
            ]);
            setCards(cardsData);
            setMembers(membersData);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            await cardsApi.create({ name, ownerUserId });
            setName("");
            setOwnerUserId("");
            await loadData();
            toast.success("Cartão adicionado com sucesso.");
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: number) {
        const ok = await confirm({
            title: "Excluir cartão",
            message: "Tem certeza que deseja excluir este cartão? Essa ação não pode ser desfeita.",
            confirmLabel: "Excluir",
            danger: true,
        });
        if (!ok) return;

        try {
            await cardsApi.remove(id);
            await loadData();
            toast.success("Cartão excluído.");
        } catch (err) {
            const message = (err as Error).message;
            setError(message);
            toast.error(message);
        }
    }

    return (
        <div className="cards-page">
            <header className="cards-header">
                <div className="cards-heading">
                    <h1>Cartões</h1>
                    <p>Cadastre os cartões de cada um para vincular aos lançamentos.</p>
                </div>

                <form onSubmit={handleSubmit} className="card-form">
                    <label className="card-field">
                        <span>Nome do cartão</span>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Nubank, LATAM Pass..."
                            required
                        />
                    </label>

                    <label className="card-field">
                        <span>Dono do cartão</span>
                        <select
                            value={ownerUserId}
                            onChange={(e) => setOwnerUserId(e.target.value)}
                            required
                        >
                            <option value="">Selecione...</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button type="submit" className="card-submit" disabled={submitting}>
                        {submitting ? "Salvando..." : "Adicionar"}
                    </button>
                </form>

                {error && <p className="card-error">{error}</p>}
            </header>

            {loading ? (
                <p className="cards-empty">Carregando...</p>
            ) : cards.length === 0 ? (
                <div className="cards-empty-state">
                    <p>Nenhum cartão cadastrado ainda.</p>
                    <span>Adicione o primeiro cartão ali em cima.</span>
                </div>
            ) : (
                <div className="card-grid">
                    {cards.map((card) => (
                        <article className="card-tile" key={card.id}>
                            <div className="card-tile-main">
                                <span className="card-name">{card.name}</span>
                                <span className="card-owner-tag">{memberName(card.ownerUserId)}</span>
                            </div>
                            <button
                                type="button"
                                className="card-delete"
                                onClick={() => handleDelete(card.id)}
                            >
                                Excluir
                            </button>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
