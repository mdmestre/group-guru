/**
 * CRM State Management Hook
 * Separa estado de UI do estado de domínio
 * Preparado para integração com backend
 */

import { useState, useCallback, useMemo } from "react";
import { Deal, Activity, Person, Organization, User, Pipeline } from "@/types/pipedrive";
import {
  updateDealWithValidation,
  calculateWeightedValue,
  calculateDaysInStage,
  dealNeedsAttention,
  dealIsStuck,
} from "@/lib/crm/dealDomain";

interface UseCRMProps {
  initialDeals: Deal[];
  initialActivities: Activity[];
  initialPersons: Person[];
  initialOrganizations: Organization[];
  users: User[];
  pipeline: Pipeline;
  currentUserId: string; // TODO: Pegar do contexto de autenticação
}

export function useCRM({
  initialDeals,
  initialActivities,
  initialPersons,
  initialOrganizations,
  users,
  pipeline,
  currentUserId,
}: UseCRMProps) {
  // ============================================
  // DOMAIN STATE (Estado de domínio - fonte única da verdade)
  // ============================================
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [persons, setPersons] = useState<Person[]>(initialPersons);
  const [organizations, setOrganizations] = useState<Organization[]>(initialOrganizations);

  // ============================================
  // UI STATE (Estado de interface)
  // ============================================
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // ============================================
  // COMPUTED VALUES (Valores calculados)
  // ============================================
  const openDeals = useMemo(() => deals.filter(d => d.status === "open"), [deals]);
  const wonDeals = useMemo(() => deals.filter(d => d.status === "won"), [deals]);
  const lostDeals = useMemo(() => deals.filter(d => d.status === "lost"), [deals]);

  const totalOpenValue = useMemo(
    () => openDeals.reduce((sum, d) => sum + d.value, 0),
    [openDeals]
  );

  const totalWonValue = useMemo(
    () => wonDeals.reduce((sum, d) => sum + d.value, 0),
    [wonDeals]
  );

  const totalWeightedValue = useMemo(() => {
    return openDeals.reduce((sum, deal) => {
      const stage = pipeline.stages.find(s => s.id === deal.stageId);
      return sum + calculateWeightedValue(deal, stage);
    }, 0);
  }, [openDeals, pipeline.stages]);

  const conversionRate = useMemo(() => {
    const totalClosed = wonDeals.length + lostDeals.length;
    if (totalClosed === 0) return 0;
    return (wonDeals.length / totalClosed) * 100;
  }, [wonDeals.length, lostDeals.length]);

  // Deals que precisam de atenção
  const dealsNeedingAttention = useMemo(() => {
    return openDeals.filter(deal => {
      const dealActivities = activities.filter(a => a.dealId === deal.id);
      const lastActivity = dealActivities
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      const dealWithActivity = {
        ...deal,
        lastActivityDate: lastActivity ? new Date(lastActivity.createdAt) : undefined,
      };
      
      return dealNeedsAttention(dealWithActivity, 7);
    });
  }, [openDeals, activities]);

  // Deals parados
  const stuckDeals = useMemo(() => {
    return openDeals.filter(deal => {
      const dealWithDays = {
        ...deal,
        daysInCurrentStage: calculateDaysInStage(deal, deal.timeline),
      };
      return dealIsStuck(dealWithDays, 14);
    });
  }, [openDeals]);

  // ============================================
  // DOMAIN ACTIONS (Ações de domínio)
  // ============================================

  /**
   * Move deal to new stage with validation and timeline
   * TODO: Quando integrar backend, chamar API aqui
   */
  const moveDealToStage = useCallback(
    (dealId: string, newStageId: string) => {
      setDeals(prev => {
        const deal = prev.find(d => d.id === dealId);
        if (!deal) return prev;

        try {
          const { deal: updatedDeal } = updateDealWithValidation(
            deal,
            { stageId: newStageId },
            currentUserId,
            pipeline.stages
          );

          // TODO: API call
          // await api.updateDeal(updatedDeal.id, { stageId: newStageId });

          return prev.map(d => (d.id === dealId ? updatedDeal : d));
        } catch (error) {
          console.error("Error moving deal:", error);
          // TODO: Mostrar toast de erro
          return prev;
        }
      });
    },
    [currentUserId, pipeline.stages]
  );

  /**
   * Update deal with validation
   * TODO: Quando integrar backend, chamar API aqui
   */
  const updateDeal = useCallback(
    (updatedDeal: Deal) => {
      setDeals(prev => {
        const currentDeal = prev.find(d => d.id === updatedDeal.id);
        if (!currentDeal) return prev;

        try {
          const { deal: validatedDeal } = updateDealWithValidation(
            currentDeal,
            updatedDeal,
            currentUserId,
            pipeline.stages
          );

          // TODO: API call
          // await api.updateDeal(validatedDeal.id, validatedDeal);

          return prev.map(d => (d.id === updatedDeal.id ? validatedDeal : d));
        } catch (error) {
          console.error("Error updating deal:", error);
          // TODO: Mostrar toast de erro
          return prev;
        }
      });
    },
    [currentUserId, pipeline.stages]
  );

  /**
   * Create new deal
   * TODO: Quando integrar backend, chamar API aqui
   */
  const createDeal = useCallback(
    (stageId: string) => {
      const newDeal: Deal = {
        id: `deal-${Date.now()}`,
        title: "Novo Negócio",
        value: 0,
        currency: "BRL",
        stageId,
        ownerId: currentUserId,
        status: "open",
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline: [
          {
            id: `timeline-${Date.now()}`,
            dealId: `deal-${Date.now()}`,
            type: "created",
            userId: currentUserId,
            timestamp: new Date(),
            description: "Negócio criado",
          },
        ],
      };

      // TODO: API call
      // const created = await api.createDeal(newDeal);
      // setDeals(prev => [...prev, created]);

      setDeals(prev => [...prev, newDeal]);
      return newDeal;
    },
    [currentUserId]
  );

  /**
   * Delete deal
   * TODO: Quando integrar backend, chamar API aqui
   */
  const deleteDeal = useCallback((dealId: string) => {
    // TODO: API call
    // await api.deleteDeal(dealId);
    setDeals(prev => prev.filter(d => d.id !== dealId));
    if (selectedDeal?.id === dealId) {
      setSelectedDeal(null);
    }
  }, [selectedDeal]);

  /**
   * Create activity linked to deal
   * TODO: Quando integrar backend, chamar API aqui
   */
  const createActivity = useCallback((activity: Activity) => {
    // TODO: API call
    // const created = await api.createActivity(activity);
    // setActivities(prev => [...prev, created]);

    setActivities(prev => [...prev, activity]);

    // Atualizar lastActivityDate do deal
    if (activity.dealId) {
      setDeals(prev =>
        prev.map(deal =>
          deal.id === activity.dealId
            ? { ...deal, lastActivityDate: new Date(activity.createdAt) }
            : deal
        )
      );
    }
  }, []);

  /**
   * Update activity
   * TODO: Quando integrar backend, chamar API aqui
   */
  const updateActivity = useCallback((updatedActivity: Activity) => {
    // TODO: API call
    // await api.updateActivity(updatedActivity.id, updatedActivity);
    setActivities(prev =>
      prev.map(a => (a.id === updatedActivity.id ? updatedActivity : a))
    );
  }, []);

  // ============================================
  // UI ACTIONS (Ações de interface)
  // ============================================
  const selectDeal = useCallback((deal: Deal | null) => {
    setSelectedDeal(deal);
  }, []);

  const setSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // ============================================
  // FILTERED DATA (Dados filtrados)
  // ============================================
  const filteredDeals = useMemo(() => {
    if (!searchTerm) return deals;
    const term = searchTerm.toLowerCase();
    return deals.filter(
      deal =>
        deal.title.toLowerCase().includes(term) ||
        persons.find(p => p.id === deal.personId)?.name.toLowerCase().includes(term) ||
        organizations.find(o => o.id === deal.organizationId)?.name.toLowerCase().includes(term)
    );
  }, [deals, searchTerm, persons, organizations]);

  const dealActivities = useMemo(() => {
    if (!selectedDeal) return [];
    return activities.filter(a => a.dealId === selectedDeal.id);
  }, [selectedDeal, activities]);

  return {
    // Domain State
    deals,
    activities,
    persons,
    organizations,
    setPersons,
    setOrganizations,

    // UI State
    selectedDeal,
    searchTerm,

    // Computed
    openDeals,
    wonDeals,
    lostDeals,
    totalOpenValue,
    totalWonValue,
    totalWeightedValue,
    conversionRate,
    dealsNeedingAttention,
    stuckDeals,
    filteredDeals,
    dealActivities,

    // Domain Actions
    moveDealToStage,
    updateDeal,
    createDeal,
    deleteDeal,
    createActivity,
    updateActivity,

    // UI Actions
    selectDeal,
    setSearch,
  };
}

