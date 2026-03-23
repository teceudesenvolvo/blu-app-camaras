import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Platform, Modal, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Ionicons } from '@expo/vector-icons';

// --- Tipos ---
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Platform, Modal, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Ionicons } from '@expo/vector-icons';

// --- Tipos ---

export type FieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'checkbox';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { label: string; value: string }[]; // Para selects
  mask?: 'cpf' | 'phone';
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
  };
}

interface DynamicFormProps {
  schema: FormField[];
  defaultValues?: Record<string, any>;
  onSubmit: (data: any) => void;
  submitLabel?: string;
  isLoading?: boolean;
}

// --- Utilitários de Máscara ---

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.')
    .replace(/(\d{3})(\d)/, '.')
    .replace(/(\d{3})(\d{1,2})/, '-')
    .replace(/(-\d{2})\d+?$/, '');
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '() ')
    .replace(/(\d{5})(\d)/, '-')
    .replace(/(-\d{4})\d+?$/, '');
};

// --- Gerador de Schema Zod ---

const generateZodSchema = (fields: FormField[]) => {
  const shape: Record<string, any> = {};

  fields.forEach((field) => {
    let validator: any;

    switch (field.type) {
      case 'number':
        validator = z.string().transform((val) => Number(val)).pipe(z.number());
        break;
      case 'checkbox':
        validator = z.boolean();
        break;
      case 'date':
        validator = z.date();
        break;
      default:
        validator = z.string();
    }

    if (field.type === 'email') validator = validator.email('E-mail inválido');

    if (field.validation?.required) {
      if (field.type === 'checkbox') {
        validator = validator.refine((val: boolean) => val === true, { message: 'Campo obrigatório' });
      } else if (field.type === 'date') {
        // z.date() já é required por padrão se não usar .optional()
      } else {
        validator = validator.min(1, 'Campo obrigatório');
      }
    } else {
      validator = validator.optional();
    }

    if (field.validation?.minLength) validator = validator.min(field.validation.minLength, `Mínimo de ${field.validation.minLength} caracteres`);
    
    shape[field.name] = validator;
  });

  return z.object(shape);
};

// --- Componente Principal ---

export default function DynamicForm({ schema, defaultValues, onSubmit, submitLabel = 'Enviar', isLoading }: DynamicFormProps) {
  const zodSchema = generateZodSchema(schema);
  
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultValues || {},
  });

  // Utilitário de estilo (Tailwind + Merge)
  const cn = (...classes: string[]) => twMerge(clsx(classes));

  // Renderizadores de Campo
  const renderField = (field: FormField) => {
    return (
      <Controller
        key={field.name}
        control={control}
        name={field.name}
        render={({ field: { onChange, value, onBlur } }) => {
          
          // Tratamento de Inputs de Texto / Número / Máscaras
          if (['text', 'number', 'email'].includes(field.type)) {
            const handleChange = (text: string) => {
              let formatted = text;
              if (field.mask === 'cpf') formatted = maskCPF(text);
              if (field.mask === 'phone') formatted = maskPhone(text);
              onChange(formatted);
            };

            return (
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">{field.label}</Text>
                <TextInput
                  className={cn(
                    "bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:border-blue-500 block w-full p-3",
                    errors[field.name] && "border-red-500 bg-red-50"
                  )}
                  placeholder={field.placeholder}
                  onBlur={onBlur}
                  onChangeText={handleChange}
                  value={value ? String(value) : ''}
                  keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                />
                {errors[field.name] && (
                  <Text className="text-red-500 text-xs mt-1">{errors[field.name]?.message as string}</Text>
                )}
              </View>
            );
          }

          // Tratamento de Data
          if (field.type === 'date') {
            const [showPicker, setShowPicker] = useState(false);
            
            return (
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">{field.label}</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  className={cn(
                    "bg-gray-50 border border-gray-300 rounded-lg p-3 flex-row justify-between items-center",
                     errors[field.name] && "border-red-500 bg-red-50"
                  )}
                >
                  <Text className={value ? "text-gray-900" : "text-gray-400"}>
                    {value ? new Date(value).toLocaleDateString('pt-BR') : (field.placeholder || 'Selecionar data')}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>

                {showPicker && (
                  <DateTimePicker
                    value={value ? new Date(value) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowPicker(false);
                      if (selectedDate) onChange(selectedDate);
                    }}
                  />
                )}
                 {errors[field.name] && (
                  <Text className="text-red-500 text-xs mt-1">{errors[field.name]?.message as string}</Text>
                )}
              </View>
            );
          }

          // Tratamento de Checkbox
          if (field.type === 'checkbox') {
            return (
              <View className="mb-4 flex-row items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                <Text className="text-gray-700 font-semibold">{field.label}</Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#004a99" }}
                  thumbColor={value ? "#f9c204" : "#f4f3f4"}
                  onValueChange={onChange}
                  value={value}
                />
                 {errors[field.name] && (
                  <Text className="text-red-500 text-xs mt-1 w-full text-right">{errors[field.name]?.message as string}</Text>
                )}
              </View>
            );
          }

          // Tratamento de Select (Picker Simples Customizado)
          if (field.type === 'select') {
             const [modalVisible, setModalVisible] = useState(false);
             const selectedLabel = field.options?.find(opt => opt.value === value)?.label;

             return (
               <View className="mb-4">
                 <Text className="text-gray-700 font-semibold mb-2">{field.label}</Text>
                 <TouchableOpacity
                   onPress={() => setModalVisible(true)}
                   className={cn(
                    "bg-gray-50 border border-gray-300 rounded-lg p-3 flex-row justify-between items-center",
                     errors[field.name] && "border-red-500 bg-red-50"
                   )}
                 >
                   <Text className={value ? "text-gray-900" : "text-gray-400"}>
                     {selectedLabel || field.placeholder || 'Selecione uma opção'}
                   </Text>
                   <Ionicons name="chevron-down" size={20} color="#666" />
                 </TouchableOpacity>

                 <Modal visible={modalVisible} animationType="slide" transparent>
                   <View className="flex-1 justify-end bg-black/50">
                     <View className="bg-white rounded-t-3xl p-5 max-h-[50%]">
                       <Text className="text-lg font-bold text-center mb-4 text-gray-800">{field.label}</Text>
                       <ScrollView>
                         {field.options?.map((opt) => (
                           <TouchableOpacity
                             key={opt.value}
                             className="p-4 border-b border-gray-100"
                             onPress={() => {
                               onChange(opt.value);
                               setModalVisible(false);
                             }}
                           >
                             <Text className={cn("text-base", value === opt.value ? "text-blue-600 font-bold" : "text-gray-700")}>
                               {opt.label}
                             </Text>
                           </TouchableOpacity>
                         ))}
                       </ScrollView>
                       <TouchableOpacity className="mt-4 p-3 bg-gray-200 rounded-lg items-center" onPress={() => setModalVisible(false)}>
                         <Text className="font-bold text-gray-600">Fechar</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 </Modal>
                 
                 {errors[field.name] && (
                  <Text className="text-red-500 text-xs mt-1">{errors[field.name]?.message as string}</Text>
                )}
               </View>
             )
          }

          return null;
        }}
      />
    );
  };

  return (
    <View className="w-full">
      {schema.map(renderField)}
      
      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        className={cn(
          "w-full p-4 rounded-xl items-center justify-center mt-4 shadow-sm",
          isLoading ? "bg-gray-400" : "bg-[#004a99]" // Usando a cor primária (hardcoded por segurança, mas poderia vir via prop)
        )}
      >
        <Text className="text-white font-bold text-lg">
          {isLoading ? 'Enviando...' : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export type FieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'checkbox';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { label: string; value: string }[]; // Para selects
  mask?: 'cpf' | 'phone';
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
  };
}

interface DynamicFormProps {
  schema: FormField[];
  defaultValues?: Record<string, any>;
  onSubmit: (data: any) => void;
  submitLabel?: string;
  isLoading?: boolean;
}

// --- Utilitários de Máscara ---

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.')
    .replace(/(\d{3})(\d)/, '.')
    .replace(/(\d{3})(\d{1,2})/, '-')
    .replace(/(-\d{2})\d+?$/, '');
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '() ')
    .replace(/(\d{5})(\d)/, '-')
    .replace(/(-\d{4})\d+?$/, '');
};

// --- Gerador de Schema Zod ---

const generateZodSchema = (fields: FormField[]) => {
  const shape: Record<string, any> = {};

  fields.forEach((field) => {
    let validator: any;

    switch (field.type) {
      case 'number':
        validator = z.string().transform((val) => Number(val)).pipe(z.number());
        break;
      case 'checkbox':
        validator = z.boolean();
        break;
      case 'date':
        validator = z.date();
        break;
      default:
        validator = z.string();
    }

    if (field.type === 'email') validator = validator.email('E-mail inválido');

    if (field.validation?.required) {
      if (field.type === 'checkbox') {
        validator = validator.refine((val: boolean) => val === true, { message: 'Campo obrigatório' });
      } else if (field.type === 'date') {
        // z.date() já é required por padrão se não usar .optional()
      } else {
        validator = validator.min(1, 'Campo obrigatório');
      }
    } else {
      validator = validator.optional();
    }

    if (field.validation?.minLength) validator = validator.min(field.validation.minLength, `Mínimo de ${field.validation.minLength} caracteres`);
    
    shape[field.name] = validator;
  });

  return z.object(shape);
};

// --- Componente Principal ---

export default function DynamicForm({ schema, defaultValues, onSubmit, submitLabel = 'Enviar', isLoading }: DynamicFormProps) {
  const zodSchema = generateZodSchema(schema);
  
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultValues || {},
  });

  // Utilitário de estilo (Tailwind + Merge)
  const cn = (...classes: string[]) => twMerge(clsx(classes));

  // Renderizadores de Campo
  const renderField = (field: FormField) => {
    return (
      <Controller
        key={field.name}
        control={control}
        name={field.name}
        render={({ field: { onChange, value, onBlur } }) => {
          
          // Tratamento de Inputs de Texto / Número / Máscaras
          if (['text', 'number', 'email'].includes(field.type)) {
            const handleChange = (text: string) => {
              let formatted = text;
              if (field.mask === 'cpf') formatted = maskCPF(text);
              if (field.mask === 'phone') formatted = maskPhone(text);
              onChange(formatted);
            };

            return (
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">{field.label}</Text>
                <TextInput
                  className={cn(
                    "bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg focus:border-blue-500 block w-full p-3",
                    errors[field.name] && "border-red-500 bg-red-50"
                  )}
                  placeholder={field.placeholder}
                  onBlur={onBlur}
                  onChangeText={handleChange}
                  value={value ? String(value) : ''}
                  keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                />
                {errors[field.name] && (
                  <Text className="text-red-500 text-xs mt-1">{errors[field.name]?.message as string}</Text>
                )}
              </View>
            );
          }

          // Tratamento de Data
          if (field.type === 'date') {
            const [showPicker, setShowPicker] = useState(false);
            
            return (
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">{field.label}</Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(true)}
                  className={cn(
                    "bg-gray-50 border border-gray-300 rounded-lg p-3 flex-row justify-between items-center",
                     errors[field.name] && "border-red-500 bg-red-50"
                  )}
                >
                  <Text className={value ? "text-gray-900" : "text-gray-400"}>
                    {value ? new Date(value).toLocaleDateString('pt-BR') : (field.placeholder || 'Selecionar data')}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                </TouchableOpacity>

                {showPicker && (
                  <DateTimePicker
                    value={value ? new Date(value) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowPicker(false);
                      if (selectedDate) onChange(selectedDate);
                    }}
                  />
                )}
                 {errors[field.name] && (
                  <Text className="text-red-500 text-xs mt-1">{errors[field.name]?.message as string}</Text>
                )}
              </View>
            );
          }

          // Tratamento de Checkbox
          if (field.type === 'checkbox') {
            return (
              <View className="mb-4 flex-row items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                <Text className="text-gray-700 font-semibold">{field.label}</Text>
                <Switch
                  trackColor={{ false: "#767577", true: "#004a99" }}
                  thumbColor={value ? "#f9c204" : "#f4f3f4"}
                  onValueChange={onChange}
                  value={value}
                />
                 {errors[field.name] && (
                  <Text className="text-red-500 text-xs mt-1 w-full text-right">{errors[field.name]?.message as string}</Text>
                )}
              </View>
            );
          }

          // Tratamento de Select (Picker Simples Customizado)
          if (field.type === 'select') {
             const [modalVisible, setModalVisible] = useState(false);
             const selectedLabel = field.options?.find(opt => opt.value === value)?.label;

             return (
               <View className="mb-4">
                 <Text className="text-gray-700 font-semibold mb-2">{field.label}</Text>
                 <TouchableOpacity
                   onPress={() => setModalVisible(true)}
                   className={cn(
                    "bg-gray-50 border border-gray-300 rounded-lg p-3 flex-row justify-between items-center",
                     errors[field.name] && "border-red-500 bg-red-50"
                   )}
                 >
                   <Text className={value ? "text-gray-900" : "text-gray-400"}>
                     {selectedLabel || field.placeholder || 'Selecione uma opção'}
                   </Text>
                   <Ionicons name="chevron-down" size={20} color="#666" />
                 </TouchableOpacity>

                 <Modal visible={modalVisible} animationType="slide" transparent>
                   <View className="flex-1 justify-end bg-black/50">
                     <View className="bg-white rounded-t-3xl p-5 max-h-[50%]">
                       <Text className="text-lg font-bold text-center mb-4 text-gray-800">{field.label}</Text>
                       <ScrollView>
                         {field.options?.map((opt) => (
                           <TouchableOpacity
                             key={opt.value}
                             className="p-4 border-b border-gray-100"
                             onPress={() => {
                               onChange(opt.value);
                               setModalVisible(false);
                             }}
                           >
                             <Text className={cn("text-base", value === opt.value ? "text-blue-600 font-bold" : "text-gray-700")}>
                               {opt.label}
                             </Text>
                           </TouchableOpacity>
                         ))}
                       </ScrollView>
                       <TouchableOpacity className="mt-4 p-3 bg-gray-200 rounded-lg items-center" onPress={() => setModalVisible(false)}>
                         <Text className="font-bold text-gray-600">Fechar</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 </Modal>
                 
                 {errors[field.name] && (
                  <Text className="text-red-500 text-xs mt-1">{errors[field.name]?.message as string}</Text>
                )}
               </View>
             )
          }

          return null;
        }}
      />
    );
  };

  return (
    <View className="w-full">
      {schema.map(renderField)}
      
      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        className={cn(
          "w-full p-4 rounded-xl items-center justify-center mt-4 shadow-sm",
          isLoading ? "bg-gray-400" : "bg-[#004a99]" // Usando a cor primária (hardcoded por segurança, mas poderia vir via prop)
        )}
      >
        <Text className="text-white font-bold text-lg">
          {isLoading ? 'Enviando...' : submitLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
