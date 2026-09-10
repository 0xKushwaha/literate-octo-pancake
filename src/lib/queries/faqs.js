import { useEffect, useState } from 'react';
import { supabase, isDemo } from '../supabase';
import { demoFaqs } from '../demoData';
import { faqs as staticFaqs } from '../../data/site';

export function useFaqs() {
  const [faqs, setFaqs] = useState(staticFaqs);

  useEffect(() => {
    if (isDemo) {
      const published = demoFaqs.listPublished();
      if (published.length) setFaqs(published.map((r) => ({ q: r.question, a: r.answer })));
      return;
    }

    supabase
      .from('faq_items')
      .select('question, answer, sort_order')
      .eq('is_published', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data?.length) {
          setFaqs(data.map((r) => ({ q: r.question, a: r.answer })));
        }
      });
  }, []);

  return faqs;
}

// Admin only
export async function listAllFaqs() {
  if (isDemo) return demoFaqs.listAll();

  const { data, error } = await supabase
    .from('faq_items')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function upsertFaq(faq) {
  if (isDemo) return demoFaqs.upsert(faq);

  const { data, error } = await supabase
    .from('faq_items')
    .upsert(faq, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFaq(id) {
  if (isDemo) return demoFaqs.delete(id);

  const { error } = await supabase.from('faq_items').delete().eq('id', id);
  if (error) throw error;
}
