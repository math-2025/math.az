"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { PlusCircle, Trash2, Image as ImageIcon, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Exam } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Checkbox } from "./ui/checkbox";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { app } from "@/firebase/config";
import { ScrollArea } from "./ui/scroll-area";
import { format } from "date-fns";
import { nanoid } from 'nanoid';

const mathSymbols = ['√', '∛', '²', '³', 'π', 'Σ', '∫', '≠', '≤', '≥', '÷', '×', '∞', '°', '±'];

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Sual mətni tələb olunur."),
  type: z.enum(["multiple-choice", "free-form"]),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1, "Düzgün cavab tələb olunur."),
  fileDataUrl: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.string().optional(),
  fileName: z.string().optional(),
});

const formSchema = z.object({
  title: z.string().min(1, "İmtahan adı tələb olunur."),
  assignedGroups: z.array(z.string()).min(1, "Ən azı bir qrup təyin edilməlidir."),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Başlama vaxtı tələb olunur." }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Bitmə vaxtı tələb olunur." }),
  pointsPerQuestion: z.coerce.number().min(1, "Bal ən azı 1 olmalıdır."),
  questions: z.array(questionSchema).min(1, "Ən azı bir sual tələb olunur."),
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
    message: "Bitmə vaxtı başlama vaxtından sonra olmalıdır.",
    path: ["endTime"],
});

type CreateExamFormProps = {
  existingExam?: Exam;
};

export function CreateExamForm({ existingExam }: CreateExamFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const textAreaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [studentGroups, setStudentGroups] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const db = getFirestore(app);
  const storage = getStorage(app);

  const isEditMode = !!existingExam;

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "studentGroups"), (snapshot) => {
        const groupsData = snapshot.docs.map(doc => doc.data().name as string);
        setStudentGroups(groupsData);
    });
    return () => unsubscribe();
  }, [db]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? {
      ...existingExam,
      startTime: format(new Date(existingExam.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(existingExam.endTime), "yyyy-MM-dd'T'HH:mm"),
    } : {
      title: "",
      assignedGroups: [],
      startTime: "",
      endTime: "",
      pointsPerQuestion: 10,
      questions: [
        { id: nanoid(), text: "", type: "multiple-choice", options: ["", "", "", "", ""], correctAnswer: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });
  
  const handleSymbolClick = (symbol: string, index: number) => {
    const textarea = textAreaRefs.current[index];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + symbol + text.substring(end);
    
    form.setValue(`questions.${index}.text`, newText);
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue(`questions.${index}.fileDataUrl`, reader.result as string);
        form.setValue(`questions.${index}.fileType`, file.type);
        form.setValue(`questions.${index}.fileName`, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      // 1. Upload files to Firebase Storage and get download URLs
      const processedQuestions = await Promise.all(values.questions.map(async (q) => {
        // Only upload if there's a new file data url (i.e., a new file was selected)
        if (q.fileDataUrl && q.fileName) {
          const storageRef = ref(storage, `exam_files/${nanoid()}-${q.fileName}`);
          const uploadResult = await uploadString(storageRef, q.fileDataUrl, 'data_url');
          const downloadURL = await getDownloadURL(uploadResult.ref);
          // Return question with the new URL and remove the local data URL
          return { ...q, fileUrl: downloadURL, fileDataUrl: undefined };
        }
        // If no new file, keep the existing fileUrl (if any)
        return { ...q, fileDataUrl: undefined };
      }));

      // 2. Prepare the final exam object
      const finalExamData = {
        ...values,
        questions: processedQuestions,
      };

      if (isEditMode) {
        // Update existing exam
        const examRef = doc(db, 'exams', existingExam.id);
        await updateDoc(examRef, finalExamData);
        toast({
          title: "İmtahan Uğurla Yeniləndi!",
          description: "Dəyişikliklər yadda saxlanıldı.",
        });
      } else {
        // Create new exam
        await addDoc(collection(db, "exams"), { ...finalExamData, announcement: '' });
        toast({
          title: "İmtahan Uğurla Yaradıldı!",
          description: "Yeni imtahan yadda saxlanıldı.",
        });
      }
      router.push("/teacher/dashboard");
    } catch (error) {
      console.error("Error saving exam:", error);
      toast({
        title: "Xəta",
        description: "İmtahan yadda saxlanılarkən xəta baş verdi.",
        variant: "destructive"
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>İmtahan Adı</FormLabel>
                <FormControl>
                  <Input placeholder="məs., Aralıq Riyaziyyat İmtahanı" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="assignedGroups"
            render={() => (
              <FormItem>
                <FormLabel>Təyin Edilmiş Qruplar</FormLabel>
                 <ScrollArea className="h-32 w-full rounded-md border">
                    <div className="p-4">
                        {studentGroups.length === 0 ? <p className="text-sm text-muted-foreground">Heç bir qrup yaradılmayıb.</p> : studentGroups.map((group) => (
                        <FormField
                            key={group}
                            control={form.control}
                            name="assignedGroups"
                            render={({ field }) => {
                            return (
                                <FormItem key={group} className="flex flex-row items-start space-x-3 space-y-0 p-2 hover:bg-muted rounded-md">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value?.includes(group)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                        ? field.onChange([...(field.value || []), group])
                                        : field.onChange(
                                            field.value?.filter(
                                                (value) => value !== group
                                            )
                                            )
                                    }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal w-full cursor-pointer">
                                    {group}
                                </FormLabel>
                                </FormItem>
                            )
                            }}
                        />
                        ))}
                    </div>
                </ScrollArea>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Başlama Vaxtı</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bitmə Vaxtı</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pointsPerQuestion"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hər Suala Düşən Bal</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Suallar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 {fields.map((field, index) => {
                    const questionType = form.watch(`questions.${index}.type`);
                    const fileDataUrl = form.watch(`questions.${index}.fileDataUrl`);
                    const fileUrl = form.watch(`questions.${index}.fileUrl`);
                    const finalFileUrl = fileDataUrl || fileUrl;
                    const fileType = form.watch(`questions.${index}.fileType`);
                    const fileName = form.watch(`questions.${index}.fileName`);

                    return (
                        <Card key={field.id} className="p-4 bg-muted/40 border rounded-lg">
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold text-lg">Sual {index + 1}</h4>
                                {fields.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name={`questions.${index}.text`}
                                    render={({ field: textField }) => (
                                    <FormItem>
                                        <FormLabel>Sual Mətni</FormLabel>
                                         <div className="flex flex-wrap gap-1 p-1 rounded-md bg-background border">
                                            {mathSymbols.map((symbol) => (
                                                <Button key={symbol} type="button" variant="outline" size="icon" className="h-8 w-8 font-mono text-lg" onClick={() => handleSymbolClick(symbol, index)}>
                                                    {symbol}
                                                </Button>
                                            ))}
                                        </div>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Sual nədir?" 
                                                {...textField}
                                                ref={(el) => { textAreaRefs.current[index] = el; }}
                                             />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />

                                <FormItem>
                                    <FormLabel>Sual üçün Fayl (Şəkil və ya PDF, İstəyə bağlı)</FormLabel>
                                    <div className="flex items-center gap-4">
                                        <Button type="button" variant="outline" onClick={() => fileInputRefs.current[index]?.click()}>
                                            <ImageIcon className="mr-2 h-4 w-4"/> Fayl Yüklə
                                        </Button>
                                         <FormControl>
                                            <Input 
                                                type="file" 
                                                className="hidden"
                                                accept="image/*,application/pdf"
                                                ref={(el) => fileInputRefs.current[index] = el}
                                                onChange={(e) => handleFileChange(e, index)}
                                            />
                                        </FormControl>
                                        {finalFileUrl && fileType?.startsWith('image/') && (
                                            <div className="relative w-32 h-20 rounded-md overflow-hidden border">
                                                <Image src={finalFileUrl} alt={`Sual ${index + 1} şəkli`} layout="fill" objectFit="contain" />
                                            </div>
                                        )}
                                        {finalFileUrl && fileType === 'application/pdf' && (
                                            <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
                                                <FileText className="h-6 w-6 text-red-600" />
                                                <span className="text-sm text-muted-foreground truncate max-w-[150px]" title={fileName}>{fileName}</span>
                                            </div>
                                        )}
                                    </div>
                                    <FormMessage />
                                </FormItem>

                                <FormField
                                    control={form.control}
                                    name={`questions.${index}.type`}
                                    render={({ field: typeField }) => (
                                    <FormItem>
                                        <FormLabel>Sual Tipi</FormLabel>
                                        <Select onValueChange={(value) => {
                                            typeField.onChange(value);
                                            if (value === 'free-form') {
                                                form.setValue(`questions.${index}.options`, []);
                                            } else {
                                                form.setValue(`questions.${index}.options`, ["", "", "", "", ""]);
                                            }
                                        }} defaultValue={typeField.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Bir tip seçin" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="multiple-choice">Çoxvariantlı</SelectItem>
                                                <SelectItem value="free-form">Açıq Tipli</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                {questionType === 'multiple-choice' && (
                                    <div className="space-y-2">
                                        <FormLabel>Variantlar</FormLabel>
                                        {[0,1,2,3,4].map(optionIndex => (
                                            <FormField
                                                key={`${field.id}-option-${optionIndex}`}
                                                control={form.control}
                                                name={`questions.${index}.options.${optionIndex}`}
                                                render={({ field: optionField }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder={`Variant ${optionIndex + 1}`} {...optionField} value={optionField.value || ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                                 <FormField
                                    control={form.control}
                                    name={`questions.${index}.correctAnswer`}
                                    render={({ field: answerField }) => (
                                    <FormItem>
                                        <FormLabel>Düzgün Cavab</FormLabel>
                                        <FormControl>
                                            <Input placeholder={questionType === 'multiple-choice' ? "Düzgün variantın mətnini daxil edin" : "Düzgün cavabı dəqiq daxil edin"} {...answerField} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </Card>
                    )
                 })}
                 <Button type="button" variant="outline" onClick={() => append({ id: nanoid(), text: "", type: "multiple-choice", options: ["", "", "", "", ""], correctAnswer: "" })}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Sual Əlavə Et
                </Button>
            </CardContent>
        </Card>

        <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
          {isSubmitting ? 'Yadda saxlanılır...' : isEditMode ? 'Dəyişiklikləri Yadda Saxla' : 'İmtahan Yarat'}
        </Button>
      </form>
    </Form>
  );
}
