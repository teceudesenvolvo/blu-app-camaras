import { Image } from 'expo-image';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { firestore } from '../../services/firebaseConfig';
import { ModuleButton, ModuleError, ModulePage, ModuleRow, ModuleText } from '../components/CitizenModuleUi';
import { AuthContext } from '../context/AuthContext';

const published = item => item.status === 'Publicado';
const plain = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const videoUrl = value => {
  const url = String(value || '');
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^?&/]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return vimeo ? `https://player.vimeo.com/video/${vimeo[1]}` : url;
};

export default function EscolaParlamentoScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [news, setNews] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [contents, setContents] = useState([]);
  const [progress, setProgress] = useState([]);
  const [course, setCourse] = useState(null);
  const [lessonId, setLessonId] = useState('');
  const [mode, setMode] = useState('catalog');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      getDocs(collection(firestore, 'escola-parlamento-cursos')),
      getDocs(collection(firestore, 'escola-parlamento-noticias')),
      getDocs(query(collection(firestore, 'escola-parlamento-matriculas'), where('userId', '==', user.uid))),
    ]).then(([courseSnap, newsSnap, enrollmentSnap]) => {
      if (!active) return;
      setCourses(courseSnap.docs.map(row => ({ id: row.id, ...row.data() })).filter(published));
      setNews(newsSnap.docs.map(row => ({ id: row.id, ...row.data() })).filter(published));
      setEnrollments(enrollmentSnap.docs.map(row => ({ id: row.id, ...row.data() })));
    }).catch(failure => { if (active) setError(failure.message || 'Não foi possível carregar os cursos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user.uid]);

  const enroll = async item => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (!enrollments.some(entry => entry.courseId === item.id)) {
        const profile = (await getDoc(doc(firestore, 'users', user.uid))).data() || {};
        const record = await addDoc(collection(firestore, 'escola-parlamento-matriculas'), { courseId: item.id, userId: user.uid, userName: profile.name || profile.nome || user.displayName || '', userEmail: user.email || '', createdAt: serverTimestamp() });
        setEnrollments(previous => [...previous, { id: record.id, courseId: item.id, userId: user.uid }]);
      }
      await openCourse(item);
    } catch (failure) { setError(failure.message || 'Não foi possível realizar a matrícula.'); }
    finally { setBusy(false); }
  };
  const openCourse = async item => {
    setBusy(true); setError('');
    try {
      const [lessonSnap, contentSnap, progressSnap] = await Promise.all([
        getDocs(query(collection(firestore, 'escola-parlamento-aulas'), where('courseId', '==', item.id))),
        getDocs(query(collection(firestore, 'escola-parlamento-conteudos'), where('courseId', '==', item.id))),
        getDocs(query(collection(firestore, 'escola-parlamento-progresso'), where('userId', '==', user.uid))),
      ]);
      const visible = lessonSnap.docs.map(row => ({ id: row.id, ...row.data() })).filter(published);
      setLessons(visible); setContents(contentSnap.docs.map(row => ({ id: row.id, ...row.data() })).filter(published));
      setProgress(progressSnap.docs.map(row => row.data()).filter(entry => entry.courseId === item.id));
      setCourse(item); setLessonId(visible[0]?.id || ''); setMode('course');
    } catch (failure) { setError(failure.message || 'Não foi possível abrir o curso.'); }
    finally { setBusy(false); }
  };
  const selectLesson = async item => {
    setLessonId(item.id);
    if (progress.some(entry => entry.lessonId === item.id)) return;
    try {
      await setDoc(doc(firestore, 'escola-parlamento-progresso', `${user.uid}_${item.id}`), { userId: user.uid, courseId: course.id, lessonId: item.id, action: 'assistiu', watchedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      setProgress(previous => [...previous, { lessonId: item.id, courseId: course.id }]);
    } catch (failure) { setError(failure.message || 'Não foi possível registrar o progresso.'); }
  };
  const activeLesson = lessons.find(item => item.id === lessonId);
  const enrolledIds = new Set(enrollments.map(item => item.courseId));
  const openMaterial = async url => {
    if (!url) return;
    try { if (await Linking.canOpenURL(url)) await Linking.openURL(url); else setError('Material indisponível neste dispositivo.'); }
    catch { setError('Não foi possível abrir o material.'); }
  };

  return <ModulePage navigation={navigation} title="Escola do Parlamento" subtitle="Cursos e formação cidadã">
    {loading ? <ActivityIndicator /> : null}
    {mode === 'catalog' ? <>
      <ModuleText heading>Cursos publicados</ModuleText>
      {!loading && !courses.length && !error ? <ModuleText muted style={{ marginTop: 10 }}>Nenhum curso publicado no momento.</ModuleText> : null}
      {courses.map(item => <ModuleRow key={item.id} title={item.title || 'Curso'} detail={plain(item.description)} onPress={() => enrolledIds.has(item.id) ? openCourse(item) : enroll(item)}>
        {item.coverUrl ? <Image source={{ uri: item.coverUrl }} contentFit="cover" style={{ width: '100%', height: 150, borderRadius: 6, marginTop: 10 }} /> : null}
        <ModuleText style={{ marginTop: 8 }}>{enrolledIds.has(item.id) ? 'Abrir curso' : 'Matricular-se'}</ModuleText>
      </ModuleRow>)}
      <ModuleText heading style={{ marginTop: 27 }}>Notícias da Escola</ModuleText>
      {news.map(item => <ModuleRow key={item.id} title={item.title || 'Notícia'} detail={plain(item.summary || item.description || item.content)} disabled />)}
      {!news.length && !loading ? <ModuleText muted style={{ marginTop: 8 }}>Nenhuma notícia publicada.</ModuleText> : null}
    </> : null}
    {mode === 'course' && course ? <>
      <ModuleText heading>{course.title}</ModuleText>
      <ModuleText muted>{progress.length} de {lessons.length} aulas concluídas</ModuleText>
      {activeLesson ? <View style={{ marginTop: 20 }}>
        <ModuleText heading>{activeLesson.title}</ModuleText>
        {activeLesson.videoUrl ? <View style={{ height: 210, marginTop: 12 }}><WebView source={{ uri: videoUrl(activeLesson.videoUrl) }} allowsInlineMediaPlayback allowsPictureInPictureMediaPlayback /></View> : null}
        <ModuleText style={{ marginTop: 12 }}>{plain(activeLesson.description)}</ModuleText>
        {contents.filter(item => item.lessonId === activeLesson.id && item.contentType !== 'questionnaire').map(item => <ModuleRow key={item.id} title={item.title || 'Material'} detail={plain(item.description)} onPress={() => openMaterial(item.attachment?.url || item.url)} />)}
      </View> : <ModuleText muted style={{ marginTop: 15 }}>Este curso ainda não possui aulas publicadas.</ModuleText>}
      <ModuleText heading style={{ marginTop: 25 }}>Aulas</ModuleText>
      {lessons.map(item => <ModuleRow key={item.id} title={item.title} detail={progress.some(entry => entry.lessonId === item.id) ? 'Concluída' : 'Assistir aula'} onPress={() => selectLesson(item)} />)}
      <ModuleButton secondary onPress={() => setMode('catalog')}>Voltar aos cursos</ModuleButton>
    </> : null}
    {busy ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
    <ModuleError>{error}</ModuleError>
  </ModulePage>;
}
