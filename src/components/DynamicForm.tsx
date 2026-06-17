import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { clsx } from 'clsx';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { z } from 'zod';

export type FieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'checkbox';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { label: string; value: string }[];
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
  defaultValues?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  submitLabel?: string;
  isLoading?: boolean;
}

type FieldErrorMap = Record<string, { message?: string } | undefined>;

const cn = (...classes: (string | false | null | undefined)[]) => twMerge(clsx(classes));

const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const getErrorMessage = (errors: FieldErrorMap, fieldName: string) => {
  const message = errors[fieldName]?.message;
  return typeof message === 'string' ? message : null;
};

const generateZodSchema = (fields: FormField[]) => {
  const shape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let validator: z.ZodTypeAny;

    switch (field.type) {
      case 'number':
        validator = z.string().transform((value) => Number(value)).pipe(z.number());
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

    if (field.type === 'email') {
      validator = (validator as z.ZodString).email('E-mail inválido');
    }

    if (field.validation?.required) {
      if (field.type === 'checkbox') {
        validator = validator.refine((value) => value === true, { message: 'Campo obrigatório' });
      } else if (field.type !== 'date') {
        validator = (validator as z.ZodString).min(1, 'Campo obrigatório');
      }
    } else {
      validator = validator.optional();
    }

    if (field.validation?.minLength && field.type !== 'date' && field.type !== 'checkbox') {
      validator = (validator as z.ZodString).min(
        field.validation.minLength,
        `Mínimo de ${field.validation.minLength} caracteres`,
      );
    }

    shape[field.name] = validator;
  });

  return z.object(shape);
};

function TextField({
  field,
  value,
  onChange,
  onBlur,
  errorMessage,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: string) => void;
  onBlur: () => void;
  errorMessage: string | null;
}) {
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
          'bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg block w-full p-3',
          errorMessage && 'border-red-500 bg-red-50',
        )}
        placeholder={field.placeholder}
        onBlur={onBlur}
        onChangeText={handleChange}
        value={value ? String(value) : ''}
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
      />
      {errorMessage && <Text className="text-red-500 text-xs mt-1">{errorMessage}</Text>}
    </View>
  );
}

function DateField({
  field,
  value,
  onChange,
  errorMessage,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: Date) => void;
  errorMessage: string | null;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value instanceof Date ? value : null;

  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-semibold mb-2">{field.label}</Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className={cn(
          'bg-gray-50 border border-gray-300 rounded-lg p-3 flex-row justify-between items-center',
          errorMessage && 'border-red-500 bg-red-50',
        )}
      >
        <Text className={dateValue ? 'text-gray-900' : 'text-gray-400'}>
          {dateValue ? dateValue.toLocaleDateString('pt-BR') : field.placeholder || 'Selecionar data'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#666" />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={dateValue || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            setShowPicker(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
      {errorMessage && <Text className="text-red-500 text-xs mt-1">{errorMessage}</Text>}
    </View>
  );
}

function SelectField({
  field,
  value,
  onChange,
  errorMessage,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: string) => void;
  errorMessage: string | null;
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = field.options?.find((option) => option.value === value)?.label;

  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-semibold mb-2">{field.label}</Text>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className={cn(
          'bg-gray-50 border border-gray-300 rounded-lg p-3 flex-row justify-between items-center',
          errorMessage && 'border-red-500 bg-red-50',
        )}
      >
        <Text className={value ? 'text-gray-900' : 'text-gray-400'}>
          {selectedLabel || field.placeholder || 'Selecione uma opção'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-5 max-h-[50%]">
            <Text className="text-lg font-bold text-center mb-4 text-gray-800">{field.label}</Text>
            <ScrollView>
              {field.options?.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  className="p-4 border-b border-gray-100"
                  onPress={() => {
                    onChange(option.value);
                    setModalVisible(false);
                  }}
                >
                  <Text className={cn('text-base', value === option.value ? 'text-blue-600 font-bold' : 'text-gray-700')}>
                    {option.label}
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

      {errorMessage && <Text className="text-red-500 text-xs mt-1">{errorMessage}</Text>}
    </View>
  );
}

function CheckboxField({
  field,
  value,
  onChange,
  errorMessage,
}: {
  field: FormField;
  value: unknown;
  onChange: (value: boolean) => void;
  errorMessage: string | null;
}) {
  return (
    <View className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
      <View className="flex-row items-center justify-between">
        <Text className="text-gray-700 font-semibold">{field.label}</Text>
        <Switch
          trackColor={{ false: '#767577', true: '#004a99' }}
          thumbColor={value ? '#f9c204' : '#f4f3f4'}
          onValueChange={onChange}
          value={Boolean(value)}
        />
      </View>
      {errorMessage && <Text className="text-red-500 text-xs mt-1 text-right">{errorMessage}</Text>}
    </View>
  );
}

export default function DynamicForm({
  schema,
  defaultValues,
  onSubmit,
  submitLabel = 'Enviar',
  isLoading,
}: DynamicFormProps) {
  const zodSchema = generateZodSchema(schema);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues: defaultValues || {},
  });

  return (
    <View className="w-full">
      {schema.map((field) => (
        <Controller
          key={field.name}
          control={control}
          name={field.name}
          render={({ field: { onChange, value, onBlur } }) => {
            const errorMessage = getErrorMessage(errors as FieldErrorMap, field.name);

            if (['text', 'number', 'email'].includes(field.type)) {
              return (
                <TextField
                  field={field}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  errorMessage={errorMessage}
                />
              );
            }

            if (field.type === 'date') {
              return <DateField field={field} value={value} onChange={onChange} errorMessage={errorMessage} />;
            }

            if (field.type === 'checkbox') {
              return <CheckboxField field={field} value={value} onChange={onChange} errorMessage={errorMessage} />;
            }

            if (field.type === 'select') {
              return <SelectField field={field} value={value} onChange={onChange} errorMessage={errorMessage} />;
            }

            return null;
          }}
        />
      ))}

      <TouchableOpacity
        onPress={handleSubmit(onSubmit)}
        disabled={isLoading}
        className={cn(
          'w-full p-4 rounded-xl items-center justify-center mt-4 shadow-sm',
          isLoading ? 'bg-gray-400' : 'bg-[#004a99]',
        )}
      >
        <Text className="text-white font-bold text-lg">{isLoading ? 'Enviando...' : submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
